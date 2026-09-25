import { runAgent, userFacingError, type AgentErrorCode } from "@/lib/ai/agent";
import {
  AGENT_ENABLED,
  MAX_BODY_BYTES,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  REQUEST_TIMEOUT_MS,
} from "@/lib/ai/config";
import { acquireSlot, consume, releaseSlot, visitorKey } from "@/lib/ai/rate-limit";
import type { AgentMessage } from "@/lib/ai/types";

/**
 * Route du conseiller virtuel.
 *
 * Runtime Node (et non Edge) : le SDK Anthropic et le client Supabase serveur
 * s'y comportent de façon prévisible. Réponse en SSE pour afficher la
 * progression pendant les appels d'outils — seuls des libellés neutres sont
 * émis, jamais d'arguments d'outil ni de contenu interne.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/** N'accepte de l'historique que la forme exacte attendue. */
function parseHistory(raw: unknown): AgentMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentMessage[] = [];
  for (const entry of raw.slice(-MAX_HISTORY_MESSAGES)) {
    if (!entry || typeof entry !== "object") continue;
    const { role, text } = entry as { role?: unknown; text?: unknown };
    if (typeof text !== "string" || !text.trim()) continue;
    if (role !== "user" && role !== "assistant") continue;
    out.push(
      role === "user"
        ? { role: "user", text: text.slice(0, MAX_MESSAGE_CHARS) }
        : { role: "assistant", text: text.slice(0, MAX_MESSAGE_CHARS * 2) }
    );
  }
  return out;
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

/**
 * Lit le corps en s'arrêtant dès le plafond franchi.
 *
 * `request.json()` analyse l'intégralité de ce qui est envoyé avant que la
 * moindre limite ne s'applique : un corps de plusieurs mégaoctets était donc
 * entièrement chargé en mémoire. Ici la lecture est interrompue au premier
 * fragment de trop, et rien de plus n'est accumulé.
 *
 * Renvoie null si le corps dépasse le plafond ou si la lecture échoue.
 */
async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const merged = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    merged.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function POST(request: Request) {
  if (!AGENT_ENABLED) return errorStream("disabled");

  const visitor = visitorKey(request);

  // Le quota est vérifié en tout premier : une requête en trop ne consomme
  // ni lecture du corps, ni analyse JSON, ni appel au modèle.
  const quota = await consume(visitor);
  if (!quota.allowed) return errorStream("rate_limited", 429, quota.retryAfterSeconds);

  // Refus sur l'en-tête déclaré quand il est présent : rien n'est lu du tout.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return errorStream("message_too_long", 413);
  }

  // L'en-tête peut être absent ou mensonger : la lecture reste bornée.
  const raw = await readBoundedBody(request);
  if (raw === null) return errorStream("message_too_long", 413);

  let body: ChatRequestBody;
  try {
    body = JSON.parse(raw) as ChatRequestBody;
  } catch {
    return errorStream("internal", 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return errorStream("internal", 400);
  if (message.length > MAX_MESSAGE_CHARS) return errorStream("message_too_long", 413);

  const history = parseHistory(body.history);

  // Réservée seulement maintenant : une requête écartée plus haut pour un
  // corps invalide ne doit jamais laisser une place occupée derrière elle.
  const slot = await acquireSlot(visitor);
  if (!slot.allowed) return errorStream("rate_limited", 429, slot.retryAfterSeconds);

  // `cancel()` et le `finally` du flux peuvent se déclencher tous les deux :
  // sans ce verrou, une même requête libérerait deux places et priverait une
  // autre requête du même visiteur de la sienne.
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    void releaseSlot(visitor);
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const push = (event: Record<string, unknown>) =>
        streamController.enqueue(encoder.encode(sse(event)));

      try {
        for await (const event of runAgent({
          message,
          history,
          signal: controller.signal,
        })) {
          if (event.type === "status") push({ type: "status", label: event.label });
          if (event.type === "message") push({ type: "message", text: event.text });
          if (event.type === "error") push({ type: "error", message: userFacingError(event.code) });
        }
      } catch {
        // Aucune trace technique ne franchit cette frontière.
        push({ type: "error", message: userFacingError("internal") });
      } finally {
        clearTimeout(timeout);
        release();
        push({ type: "done" });
        streamController.close();
      }
    },
    cancel() {
      clearTimeout(timeout);
      release();
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
