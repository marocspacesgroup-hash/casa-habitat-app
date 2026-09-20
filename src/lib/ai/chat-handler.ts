import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { runAgent, userFacingError, type AgentErrorCode, type AgentLogEvent } from "./agent";
import { AGENT_ENABLED } from "./config";
import { createFinanceCircuit, type AdmitRefusal, type FinanceCircuit, type ReleaseDecision } from "./finance/circuit";
import { financeEnvironment } from "./finance/keys";
import {
  BODY_MAX_BYTES,
  BODY_READ_TIMEOUT_MS,
  DEFERRED_RECOVERY_WINDOW_MS,
  HISTORY_MAX_CHARS,
  HISTORY_MAX_MESSAGES,
  MESSAGE_MAX_CHARS,
  REDIS_TIMEOUT_MS,
  REQUEST_DEADLINE_MS,
  STORE_RETRY_BACKOFF_MS,
} from "./finance/limits";
import { deferReconciliation, diagFields, plainSleep, reconcileWithRetry, type Defer } from "./finance/recovery";
import { createUpstashStore } from "./finance/store";
import { visitorHmacSecret, visitorKeyFromRequest, visitorLogId } from "./finance/visitor";
import { getProvider, type LlmProvider } from "./provider";
import type { AgentMessage } from "./types";

/**
 * Handler HTTP du conseiller virtuel (POST /api/chat).
 *
 * Ordre imposé :
 *  1. AGENT_ENABLED
 *  2. t0 et échéance absolue (t0 + 210 s), fixée une seule fois
 *  3. secret HMAC présent (sinon refus), clé visiteur HMAC (en-têtes seulement)
 *  4. requestId serveur
 *  5. Content-Length déclaré > 64 Ko → 413, sans Redis ni lecture
 *  6. ADMIT Redis (débit, concurrence, kill, pause) — AVANT toute lecture du
 *     corps et toute opération Supabase ou Anthropic
 *  7. lecture bornée du corps (≤ 64 Ko, ≤ 10 s), JSON, message, historique
 *  8. flux SSE → runAgent
 *  9. RELEASE garanti : `finally` du handler tant que le flux n'est pas créé,
 *     puis `finally` du flux et `cancel()` (verrou : une seule libération).
 *
 * Contrat SSE inchangé : événements `status`, `message`, `error`, `done`.
 * Journaux : JSON structuré, sans IP, message, historique, réponse ni secret.
 */

export interface ChatHandlerDependencies {
  enabled: boolean;
  circuit: FinanceCircuit;
  provider: LlmProvider;
  visitorSecret: string | null;
  now: () => number;
  log: (event: AgentLogEvent) => void;
  newRequestId: () => string;
  runAgent: typeof runAgent;
  executeTool?: Parameters<typeof runAgent>[0]["deps"]["executeTool"];
  sleep?: Parameters<typeof runAgent>[0]["deps"]["sleep"];
  /**
   * Programme une réconciliation après la réponse (production : `after()`).
   * Réservée à SETTLE, RELEASE et CANCEL déjà engagés : jamais de RESERVE ni d'appel modèle.
   */
  defer?: Defer;
}

/** Champs autorisés dans un journal ; tout autre champ est écarté. */
const LOG_FIELDS = new Set([
  "event",
  "requestId",
  "callId",
  "turn",
  "finalTurn",
  "status",
  "reason",
  "durationMs",
  "remainingMs",
  "costNano",
  "inputTokens",
  "outputTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "countedTokens",
  "attempts",
  "anthropicRequestId",
  "kill",
  "pause",
  "settleFailed",
  "countDrift",
  "overCost",
  "refunded",
  "httpStatus",
  "cause",
  "alert",
  "visitor",
  "tool",
  // Réconciliation (W1) : diagnostics en liste blanche, jamais de message d'erreur brut.
  "operation",
  "attempt",
  "outcome",
  "retryable",
  "deferred",
  "delayMs",
  "waitMs",
  "slotsRemoved",
  "refundedNano",
  "amountNano",
  "storeKind",
  "errorClass",
  "errorCode",
  "elapsedMs",
  "timeoutMs",
  "httpAttempts",
  "idleBeforeMs",
]);

export function structuredLog(event: AgentLogEvent): void {
  const safe: Record<string, unknown> = { scope: "ai.chat" };
  for (const [key, value] of Object.entries(event)) {
    if (LOG_FIELDS.has(key) && value !== undefined) safe[key] = value;
  }
  console.info(JSON.stringify(safe));
}

function sse(event: Record<string, unknown>) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function errorStream(code: AgentErrorCode, status = 200, retryAfterSeconds?: number) {
  const body = sse({ type: "error", message: userFacingError(code) }) + sse({ type: "done" });
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (retryAfterSeconds !== undefined) headers["Retry-After"] = String(retryAfterSeconds);
  return new Response(body, { status, headers });
}

type BodyRead = { kind: "ok"; text: string } | { kind: "too_large" } | { kind: "timeout" } | { kind: "error" };

/**
 * Lit le corps en s'arrêtant dès le plafond franchi (64 Ko) ou à l'expiration
 * du délai. Rien au-delà du plafond n'est accumulé en mémoire.
 */
export async function readBoundedBody(request: Request, maxBytes: number, timeoutMs: number): Promise<BodyRead> {
  if (!request.body) return { kind: "ok", text: "" };
  if (timeoutMs <= 0) return { kind: "timeout" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  try {
    for (;;) {
      const next = await Promise.race([reader.read(), expired]);
      if (next === "timeout") {
        void reader.cancel().catch(() => {});
        return { kind: "timeout" };
      }
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        return { kind: "too_large" };
      }
      chunks.push(next.value);
    }
  } catch {
    return { kind: "error" };
  } finally {
    clearTimeout(timer);
  }

  const merged = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    merged.set(chunk, at);
    at += chunk.byteLength;
  }
  return { kind: "ok", text: new TextDecoder().decode(merged) };
}

/**
 * Historique accepté : uniquement les rôles user / assistant, chaque message
 * tronqué à 1 500 caractères, au plus 12 messages et 6 000 caractères au
 * total. Les plus anciens sont retirés en premier. Aucun rôle système.
 */
export function parseHistory(raw: unknown): AgentMessage[] {
  if (!Array.isArray(raw)) return [];
  const valid: AgentMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { role, text } = entry as { role?: unknown; text?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof text !== "string" || !text.trim()) continue;
    valid.push({ role, text: text.slice(0, MESSAGE_MAX_CHARS) });
  }

  const kept: AgentMessage[] = [];
  let chars = 0;
  for (let i = valid.length - 1; i >= 0 && kept.length < HISTORY_MAX_MESSAGES; i -= 1) {
    const message = valid[i] as { role: "user" | "assistant"; text: string };
    if (chars + message.text.length > HISTORY_MAX_CHARS) break;
    chars += message.text.length;
    kept.unshift(message);
  }
  return kept;
}

function retryAfterFor(reason: AdmitRefusal, nowMs: number): number | undefined {
  if (reason === "rate_minute") return Math.max(1, Math.ceil((60_000 - (nowMs % 60_000)) / 1000));
  if (reason === "rate_hour") return Math.max(1, Math.ceil((3_600_000 - (nowMs % 3_600_000)) / 1000));
  if (reason === "concurrency_visitor" || reason === "concurrency_global") return 2;
  return undefined;
}

export function createChatHandler(resolveDeps: () => ChatHandlerDependencies) {
  return async function handleChat(request: Request): Promise<Response> {
    const deps = resolveDeps();
    if (!deps.enabled) return errorStream("disabled");

    // Échéance absolue, fixée une seule fois pour toute la requête.
    const t0 = deps.now();
    const deadlineAt = t0 + REQUEST_DEADLINE_MS;
    const remainingMs = () => deadlineAt - deps.now();

    if (!deps.visitorSecret) {
      deps.log({ event: "request_refused", reason: "visitor_secret_missing" });
      return errorStream("disabled", 503);
    }
    const visitor = visitorKeyFromRequest(request, deps.visitorSecret);
    const requestId = deps.newRequestId();

    // Refus sur l'en-tête déclaré : aucun accès Redis, aucune lecture.
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > BODY_MAX_BYTES) {
      return errorStream("message_too_long", 413);
    }

    const admitted = await deps.circuit.admit({ requestId, visitor, nowMs: t0 });
    if (!admitted.allowed) {
      deps.log({ event: "admit_refused", requestId, visitor: visitorLogId(visitor), reason: admitted.reason });
      const reason = admitted.reason;
      if (reason === "rate_minute" || reason === "rate_hour" || reason === "concurrency_visitor" || reason === "concurrency_global") {
        return errorStream("rate_limited", 429, retryAfterFor(reason, t0));
      }
      if (reason === "invalid_identifier") return errorStream("internal", 500);
      return errorStream("disabled", 503);
    }

    // RELEASE fiable : une relance après 250 ms si elle tient avant l'échéance,
    // sinon reprise différée (RELEASE uniquement, aucun effet financier). Le
    // script est idempotent : une tentative appliquée malgré un timeout fait
    // retirer 0 place à la suivante.
    let released = false;
    const release = async () => {
      if (released) return;
      released = true;
      const run = () => deps.circuit.releaseDetailed({ requestId, visitor });
      const retryable = (r: ReleaseDecision) => !r.ok && r.reason === "store_unavailable";
      const pause = (ms: number) => (deps.sleep ? deps.sleep(ms, new AbortController().signal) : plainSleep(ms));
      const failed = (r: ReleaseDecision, attempt: number, deferred: boolean) =>
        deps.log({
          event: "release_failed",
          requestId,
          operation: "release",
          attempt,
          reason: r.ok ? undefined : r.reason,
          retryable: retryable(r),
          ...(deferred ? { deferred: true } : {}),
          ...diagFields(r.ok ? undefined : r.diag),
        });
      const { result, attempt } = await reconcileWithRetry({
        run,
        retryable,
        canRetry: () => remainingMs() >= STORE_RETRY_BACKOFF_MS + REDIS_TIMEOUT_MS,
        sleep: pause,
        onFailed: (r, n) => failed(r, n, false),
        onRetry: (n, delayMs) => deps.log({ event: "release_retry", requestId, attempt: n, delayMs }),
      });
      if (result.ok) {
        if (attempt > 1) deps.log({ event: "released", requestId, attempt, slotsRemoved: result.slotsRemoved });
        return;
      }
      if (!retryable(result)) return;
      const scheduled = deferReconciliation(deps.defer, {
        run,
        retryable,
        now: deps.now,
        notAfter: deadlineAt + DEFERRED_RECOVERY_WINDOW_MS,
        sleep: pause,
        firstAttempt: attempt + 1,
        onFailed: (r, n) => failed(r, n, true),
        onDone: (r, n) => deps.log({ event: "released", requestId, attempt: n, slotsRemoved: r.ok ? r.slotsRemoved : 0, deferred: true }),
        onAbandoned: (n, why) => deps.log({ event: "release_abandoned", requestId, attempt: n, reason: why }),
      });
      deps.log(
        scheduled
          ? { event: "release_deferred", requestId }
          : { event: "release_abandoned", requestId, attempt, reason: "no_defer" }
      );
    };

    let streamOwnsRelease = false;
    try {
      const body = await readBoundedBody(request, BODY_MAX_BYTES, Math.min(BODY_READ_TIMEOUT_MS, remainingMs()));
      if (body.kind === "too_large") return errorStream("message_too_long", 413);
      if (body.kind === "timeout") return errorStream("internal", 408);
      if (body.kind === "error") return errorStream("internal", 400);

      let parsed: { message?: unknown; history?: unknown };
      try {
        parsed = JSON.parse(body.text) as { message?: unknown; history?: unknown };
      } catch {
        return errorStream("internal", 400);
      }
      if (!parsed || typeof parsed !== "object") return errorStream("internal", 400);

      const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
      if (!message) return errorStream("internal", 400);
      if (message.length > MESSAGE_MAX_CHARS) return errorStream("message_too_long", 413);

      const history = parseHistory(parsed.history);

      const cancel = new AbortController();
      const deadlineSignal = AbortSignal.timeout(Math.max(1, remainingMs()));
      const signal = AbortSignal.any([request.signal, cancel.signal, deadlineSignal]);

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let open = true;
          const push = (event: Record<string, unknown>) => {
            if (!open) return;
            try {
              controller.enqueue(encoder.encode(sse(event)));
            } catch {
              open = false;
            }
          };
          try {
            for await (const event of deps.runAgent({
              message,
              history,
              signal,
              deadlineAt,
              requestId,
              visitor,
              deps: {
                provider: deps.provider,
                circuit: deps.circuit,
                now: deps.now,
                log: deps.log,
                executeTool: deps.executeTool,
                sleep: deps.sleep,
                defer: deps.defer,
              },
            })) {
              if (event.type === "status") push({ type: "status", label: event.label });
              if (event.type === "message") push({ type: "message", text: event.text });
              if (event.type === "error") push({ type: "error", message: userFacingError(event.code) });
            }
          } catch {
            // Aucune trace technique ne franchit cette frontière.
            push({ type: "error", message: userFacingError("internal") });
          } finally {
            await release();
            push({ type: "done" });
            if (open) {
              try {
                controller.close();
              } catch {
                /* flux déjà fermé */
              }
            }
          }
        },
        async cancel() {
          // Client déconnecté : l'appel en cours est abandonné (réservation
          // conservée), aucun tour suivant, place libérée.
          cancel.abort();
          await release();
        },
      });

      streamOwnsRelease = true;
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          Connection: "keep-alive",
        },
      });
    } finally {
      if (!streamOwnsRelease) await release();
    }
  };
}

let defaultDeps: ChatHandlerDependencies | null = null;

/** Dépendances de production, créées une fois par instance. */
function productionDependencies(): ChatHandlerDependencies {
  defaultDeps ??= {
    enabled: AGENT_ENABLED,
    circuit: createFinanceCircuit(createUpstashStore(), financeEnvironment()),
    provider: getProvider(),
    visitorSecret: visitorHmacSecret(),
    now: Date.now,
    log: structuredLog,
    newRequestId: randomUUID,
    runAgent,
    // `after()` s'exécute après la réponse, dans la durée maximale de la route
    // (300 s) ; hors contexte de requête il lève : la reprise est alors
    // abandonnée (journalisé) et l'état prudent conservé.
    defer: (task) => after(task),
  };
  return defaultDeps;
}

export const handleChatRequest = createChatHandler(productionDependencies);
