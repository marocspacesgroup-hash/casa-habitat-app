import { MAX_RESULTS_PER_REQUEST, MAX_TOOL_CALLS, MAX_TOOL_CALLS_PER_TURN, MAX_TURNS } from "./config";
import type { FinanceCircuit } from "./finance/circuit";
import { runGuardedModelCall, type FinanceEvent, type GuardedResult } from "./finance/guarded-call";
import { diagFields, type Defer } from "./finance/recovery";
import {
  FINAL_TURN_THRESHOLD_MS,
  TOOLS_TURN_TIMEOUT_MS,
  TOOL_RESULT_MAX_BYTES,
  TURN_BUDGET_MS,
} from "./finance/limits";
import { SYSTEM_PROMPT } from "./prompt";
import type { LlmProvider, ModelTurn } from "./provider";
import {
  getPropertyDetails,
  requestHumanContact,
  searchProperties,
  TOOL_DEFINITIONS,
} from "./tools";
import type { AgentMessage, AgentToolCall } from "./types";

export type AgentEvent =
  | { type: "status"; label: string }
  | { type: "message"; text: string }
  | { type: "error"; code: AgentErrorCode };

export type AgentErrorCode =
  | "disabled"
  | "message_too_long"
  | "rate_limited"
  | "model_unavailable"
  | "catalogue_unavailable"
  | "no_answer"
  | "internal";

/** Événement de journal, sans aucune donnée personnelle ni contenu. */
export type AgentLogEvent = Record<string, string | number | boolean | undefined>;

/** Exécute un outil ; `remainingResults` borne les biens renvoyés. */
export type ToolExecutor = (call: AgentToolCall, remainingResults: number) => Promise<Record<string, unknown>>;

export interface AgentDependencies {
  provider: LlmProvider;
  circuit: FinanceCircuit;
  now?: () => number;
  executeTool?: ToolExecutor;
  log?: (event: AgentLogEvent) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  /** Poursuite après la réponse (production : `after()`) d'un SETTLE ou d'un CANCEL déjà engagé ; jamais de RESERVE. */
  defer?: Defer;
}

/** Libellé de progression, sans jamais exposer les arguments de l'outil. */
function statusFor(name: string): string {
  if (name === "search_properties") return "Recherche dans le catalogue…";
  if (name === "get_property_details") return "Consultation de la fiche…";
  if (name === "request_human_contact") return "Préparation du contact…";
  return "Traitement…";
}

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}

/**
 * Sérialise un résultat d'outil en ≤ 6 Ko.
 * Pour une recherche, les biens sont retirés en fin de liste (jamais coupés en
 * deux) et une note le signale. Tout autre résultat trop volumineux est
 * remplacé par une erreur courte. Le JSON produit est toujours valide.
 */
export function boundToolResult(payload: Record<string, unknown>): { json: string; properties: number } {
  const size = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
  const properties = Array.isArray(payload.properties) ? [...payload.properties] : null;

  if (size(payload) <= TOOL_RESULT_MAX_BYTES) {
    return { json: JSON.stringify(payload), properties: properties?.length ?? (payload.found === true ? 1 : 0) };
  }

  if (properties) {
    const note = "Résultat tronqué pour rester concis : proposer d'affiner la recherche.";
    while (properties.length > 0) {
      properties.pop();
      const candidate = { ...payload, properties, note };
      if (size(candidate) <= TOOL_RESULT_MAX_BYTES) {
        return { json: JSON.stringify(candidate), properties: properties.length };
      }
    }
    return { json: JSON.stringify({ count: payload.count ?? 0, properties: [], note }), properties: 0 };
  }

  return { json: toolError("Résultat trop volumineux. Proposer de préciser la demande."), properties: 0 };
}

async function executeToolDefault(call: AgentToolCall, remainingResults: number): Promise<Record<string, unknown>> {
  if (call.name === "search_properties") {
    return { ...(await searchProperties(call.input, remainingResults)) };
  }
  if (call.name === "get_property_details") {
    if (remainingResults <= 0) {
      return { error: "Plafond de biens atteint pour cette demande. Inviter à préciser la recherche ou à contacter un conseiller." };
    }
    return { ...(await getPropertyDetails(call.input)) };
  }
  if (call.name === "request_human_contact") {
    return { ...(await requestHumanContact(call.input)) };
  }
  return { error: "Outil inconnu." };
}

type Raced<V> = { kind: "ok"; value: V } | { kind: "timeout" } | { kind: "aborted" } | { kind: "error" };

/**
 * Course entre un outil et son délai (décision D2 = A).
 *
 * `queries.ts` n'accepte aucun signal : la requête Supabase sous-jacente N'EST
 * PAS annulée. L'agent cesse seulement de l'attendre ; la requête (lecture
 * seule, sans coût) se termine ou est abandonnée en arrière-plan, et son
 * résultat tardif est ignoré.
 */
async function raceTool<V>(operation: Promise<V>, timeoutMs: number, signal: AbortSignal): Promise<Raced<V>> {
  if (signal.aborted) return { kind: "aborted" };
  if (timeoutMs <= 0) return { kind: "timeout" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const limits = new Promise<Raced<V>>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
    onAbort = () => resolve({ kind: "aborted" });
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const run = operation.then(
    (value): Raced<V> => ({ kind: "ok", value }),
    (): Raced<V> => ({ kind: "error" })
  );
  try {
    return await Promise.race([run, limits]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

/** Code d'erreur visiteur associé à un refus ou un échec du circuit. */
function errorCodeFor(result: Exclude<GuardedResult<ModelTurn>, { status: "ok" }>): AgentErrorCode {
  if (result.status === "refused") {
    switch (result.reason) {
      case "killed":
      case "paused":
      case "budget_day":
      case "budget_hour":
      case "budget_visitor":
        return "disabled";
      case "input_cap":
        return "message_too_long";
      case "duplicate_call":
      case "invalid_identifier":
        return "internal";
      default:
        return "model_unavailable";
    }
  }
  switch (result.reason) {
    case "rate_limited":
      return "rate_limited";
    case "spend_limit":
      return "disabled";
    default:
      return "model_unavailable";
  }
}

/**
 * Boucle d'agent sous contrôle financier.
 *
 * - au plus MAX_TURNS (3) tours, chacun passant par `runGuardedModelCall` ;
 * - aucun tour ne démarre avec moins de 53 s avant l'échéance ;
 * - tour final (3e tour, ou moins de 121 s restantes) : `tool_choice: none` ;
 * - outils : 3 par tour, 4 par requête, 12 biens au total, 6 Ko par résultat,
 *   15 s au plus pour l'ensemble des outils d'un tour ;
 * - l'échéance `deadlineAt` est fixée par la route et n'est jamais recalculée.
 */
export async function* runAgent(params: {
  message: string;
  history: AgentMessage[];
  signal: AbortSignal;
  deadlineAt: number;
  requestId: string;
  visitor: string;
  deps: AgentDependencies;
}): AsyncGenerator<AgentEvent> {
  const { signal, deadlineAt, requestId, visitor, deps } = params;
  const now = deps.now ?? Date.now;
  const executeTool = deps.executeTool ?? executeToolDefault;
  const log = deps.log ?? (() => {});
  const remainingMs = () => deadlineAt - now();

  const messages: AgentMessage[] = [...params.history, { role: "user", text: params.message }];

  let toolCallsUsed = 0;
  let resultsUsed = 0;
  const callSignatures = new Set<string>();

  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    if (signal.aborted) return;

    const remainingAtStart = remainingMs();
    if (remainingAtStart < TURN_BUDGET_MS) {
      log({ event: "turn_skipped", requestId, turn, reason: "deadline", remainingMs: remainingAtStart });
      yield { type: "error", code: "no_answer" };
      return;
    }

    const finalTurn = turn === MAX_TURNS || remainingAtStart < FINAL_TURN_THRESHOLD_MS;
    const request = { system: SYSTEM_PROMPT, messages: [...messages], tools: TOOL_DEFINITIONS, finalTurn };
    const callId = `${requestId}-t${turn}`;
    const startedAt = now();

    const result = await runGuardedModelCall<ModelTurn>({
      circuit: deps.circuit,
      visitor,
      requestId,
      callId,
      deadlineAt,
      now,
      signal,
      countTokens: (options) => deps.provider.countTokens(request, options),
      callModel: (options) => deps.provider.create(request, options),
      sleep: deps.sleep,
      defer: deps.defer,
      onEvent: (event: FinanceEvent) => log({ event: `finance_${event.type}`, requestId, callId, ...eventFields(event) }),
    });

    log(callLogFields(result, { requestId, callId, turn, finalTurn, durationMs: now() - startedAt, remainingMs: remainingMs() }));

    if (result.status !== "ok") {
      if (!signal.aborted) yield { type: "error", code: errorCodeFor(result) };
      return;
    }

    const turnResult = result.value;
    if (turnResult.stopReason === "refusal") {
      yield { type: "error", code: "no_answer" };
      return;
    }

    // Réponse finale : pas d'appel d'outil, ou tour final (aucun outil n'y est exécuté).
    if (turnResult.calls.length === 0 || finalTurn) {
      const text = turnResult.text.trim();
      if (!text) {
        yield { type: "error", code: "no_answer" };
        return;
      }
      yield { type: "message", text };
      return;
    }

    // Règlement impossible : la dépense de ce tour reste comptée en entier,
    // mais aucun tour supplémentaire n'est engagé (fail-closed).
    if (result.settleFailed) {
      yield { type: "error", code: "model_unavailable" };
      return;
    }

    messages.push({ role: "assistant", text: turnResult.text, calls: turnResult.calls });

    const toolsDeadline = now() + Math.min(TOOLS_TURN_TIMEOUT_MS, remainingMs() - TURN_BUDGET_MS);
    let executedThisTurn = 0;

    for (const call of turnResult.calls) {
      if (executedThisTurn >= MAX_TOOL_CALLS_PER_TURN || toolCallsUsed >= MAX_TOOL_CALLS) {
        messages.push({
          role: "tool",
          callId: call.id,
          result: toolError(
            "Nombre maximum d'appels d'outils atteint pour cette demande. Répondre avec ce qui est déjà connu, ou inviter à préciser la demande."
          ),
        });
        continue;
      }

      // Détection de boucle : le même outil avec exactement les mêmes
      // arguments deux fois dans une requête ne produira jamais autre chose.
      const signature = `${call.name}:${JSON.stringify(call.input)}`;
      if (callSignatures.has(signature)) {
        messages.push({
          role: "tool",
          callId: call.id,
          result: toolError("Cet appel identique a déjà été effectué dans cette conversation. Utiliser le résultat précédent au lieu de répéter."),
        });
        continue;
      }

      const toolTimeout = toolsDeadline - now();
      if (toolTimeout <= 0) {
        // Délai des outils épuisé : l'outil n'est pas lancé.
        messages.push({
          role: "tool",
          callId: call.id,
          result: toolError("Le catalogue est momentanément indisponible. L'indiquer au visiteur et proposer de réessayer ou de contacter un conseiller."),
        });
        continue;
      }

      callSignatures.add(signature);
      toolCallsUsed += 1;
      executedThisTurn += 1;
      yield { type: "status", label: statusFor(call.name) };

      const outcome = await raceTool(
        Promise.resolve().then(() => executeTool(call, MAX_RESULTS_PER_REQUEST - resultsUsed)),
        toolTimeout,
        signal
      );
      if (outcome.kind === "aborted") return;
      if (outcome.kind !== "ok" || !outcome.value || typeof outcome.value !== "object") {
        log({ event: "tool_failed", requestId, turn, tool: call.name, reason: outcome.kind === "ok" ? "invalid_result" : outcome.kind });
        messages.push({
          role: "tool",
          callId: call.id,
          result: toolError("Le catalogue est momentanément indisponible. L'indiquer au visiteur et proposer de réessayer ou de contacter un conseiller."),
        });
        continue;
      }

      const bounded = boundToolResult(outcome.value);
      if (call.name === "search_properties" || call.name === "get_property_details") {
        resultsUsed += bounded.properties;
      }
      messages.push({ role: "tool", callId: call.id, result: bounded.json });
    }
  }

  // Plafond de tours atteint sans réponse finale (le dernier tour est pourtant final).
  yield { type: "error", code: "no_answer" };
}

function eventFields(event: FinanceEvent): AgentLogEvent {
  switch (event.type) {
    case "alert":
      return { alert: event.alert };
    case "kill":
    case "pause":
    case "kill_observed":
      return { reason: event.reason };
    case "settle_failed":
    case "cancel_failed":
      return {
        operation: event.type === "settle_failed" ? "settle" : "cancel",
        attempt: event.attempt,
        reason: event.reason,
        retryable: event.reason === "store_unavailable",
        ...(event.deferred ? { deferred: true } : {}),
        ...diagFields(event.diag),
      };
    case "settle_retry":
      return { attempt: event.attempt, delayMs: event.delayMs };
    case "settled":
      return { attempt: event.attempt, outcome: event.outcome, ...(event.deferred ? { deferred: true } : {}) };
    case "settle_abandoned":
      return { attempt: event.attempt, reason: event.reason, costNano: event.costNano, amountNano: event.amountNano };
    case "reserve_failed":
      return { operation: "reserve", ...diagFields(event.diag) };
    case "reserve_duplicate":
      return { operation: "reserve", reason: "duplicate_call" };
    case "cancel_pending":
      return { operation: "cancel", waitMs: event.waitMs, deferred: event.deferred };
    case "cancelled":
      return { operation: "cancel", attempt: event.attempt, outcome: event.outcome, refundedNano: event.refundedNano, ...(event.deferred ? { deferred: true } : {}) };
    case "reserve_uncertain":
      return { operation: "cancel", attempt: event.attempt, amountNano: event.amountNano, ...(event.deferred ? { deferred: true } : {}) };
    default:
      return {};
  }
}

function callLogFields(
  result: GuardedResult<ModelTurn>,
  context: { requestId: string; callId: string; turn: number; finalTurn: boolean; durationMs: number; remainingMs: number }
): AgentLogEvent {
  const base: AgentLogEvent = { event: "model_call", ...context, status: result.status };
  if (result.status === "ok") {
    return {
      ...base,
      costNano: result.costNano,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cacheReadTokens: result.usage.cacheReadTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      countedTokens: result.countedTokens,
      attempts: result.attempts,
      anthropicRequestId: result.anthropicRequestId,
      settleFailed: result.settleFailed,
      kill: result.killSet,
      overCost: result.overCost,
      countDrift: result.countDrift,
    };
  }
  if (result.status === "refused") {
    return { ...base, reason: result.reason, countedTokens: result.countedTokens };
  }
  return {
    ...base,
    reason: result.reason,
    refunded: result.refunded,
    attempts: result.attempts,
    httpStatus: result.httpStatus,
    cause: result.cause,
    pause: result.paused,
    kill: result.killed,
    anthropicRequestId: result.anthropicRequestId,
  };
}

/** Message visiteur associé à chaque code d'erreur. Jamais de trace technique. */
export function userFacingError(code: AgentErrorCode): string {
  switch (code) {
    case "disabled":
      return "Le conseiller virtuel est momentanément indisponible. Vous pouvez nous joindre directement par WhatsApp.";
    case "message_too_long":
      return "Votre message est un peu long. Pouvez-vous le reformuler plus brièvement ?";
    case "rate_limited":
      return "Beaucoup de demandes en ce moment. Merci de réessayer dans un instant.";
    case "catalogue_unavailable":
      return "Le catalogue est momentanément inaccessible. Réessayez dans un instant, ou contactez-nous par WhatsApp.";
    case "model_unavailable":
    case "no_answer":
    case "internal":
    default:
      return "Je n'arrive pas à répondre pour le moment. Vous pouvez reformuler, ou nous joindre par WhatsApp.";
  }
}
