import Anthropic from "@anthropic-ai/sdk";
import { AGENT_EFFORT } from "./config";
import type { CallOptions, ModelAttempt } from "./finance/guarded-call";
import { MODEL_ID, OUTPUT_CAP_TOKENS } from "./finance/limits";
import type { AgentMessage, AgentToolCall, AgentToolDefinition, AgentTurn } from "./types";

/**
 * Fournisseur de modèle — SEUL fichier autorisé à appeler Anthropic.
 *
 * Garanties financières portées ici :
 * - un client unique, `maxRetries: 0` : le SDK ne relance JAMAIS une requête,
 *   ni pour `messages.create` ni pour `count_tokens` ; le seul retry possible
 *   est le retry applicatif de `finance/guarded-call.ts` ;
 * - aucune option par requête ne peut réactiver des retries (seuls `signal`
 *   et `timeout` sont transmis) ;
 * - modèle, `max_tokens` (1 500) et `service_tier: "standard_only"` fixés ici ;
 * - comptage et appel partagent exactement la même requête de base ;
 * - aucun paramètre susceptible d'augmenter le prix : ni `speed`, ni
 *   `inference_geo`, ni `container`, ni outil serveur, ni cache 1 h ;
 * - aucune exception ne sort de `create` : chaque issue est classée.
 *
 * Rien n'est journalisé ici (ni clé, ni message, ni réponse).
 */

export interface ModelRequest {
  system: string;
  messages: AgentMessage[];
  tools: AgentToolDefinition[];
  /** Tour final : `tool_choice: none`, aucun outil ne peut être demandé. */
  finalTurn: boolean;
}

export interface ModelTurn extends AgentTurn {
  responseId?: string;
}

export interface LlmProvider {
  readonly name: string;
  countTokens(request: ModelRequest, options: CallOptions): Promise<number>;
  create(request: ModelRequest, options: CallOptions): Promise<ModelAttempt<ModelTurn>>;
}

/** Sous-ensemble du client Anthropic utilisé : facilite les tests sans réseau. */
export interface AnthropicLikeClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming, options?: RequestLikeOptions): Promise<Anthropic.Message>;
    countTokens(params: Anthropic.MessageCountTokensParams, options?: RequestLikeOptions): Promise<Anthropic.MessageTokensCount>;
  };
}

/** Seules options transmises par requête : jamais `maxRetries`. */
export interface RequestLikeOptions {
  signal: AbortSignal;
  timeout: number;
}

function toAnthropicMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      out.push({ role: "user", content: message.text });
      continue;
    }

    if (message.role === "assistant") {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (message.text.trim()) blocks.push({ type: "text", text: message.text });
      for (const call of message.calls ?? []) {
        blocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.input });
      }
      if (blocks.length > 0) out.push({ role: "assistant", content: blocks });
      continue;
    }

    // Les résultats d'outils voyagent dans un message `user`, et plusieurs
    // résultats consécutifs doivent tenir dans un seul message — les séparer
    // apprend au modèle à ne plus paralléliser ses appels.
    const block: Anthropic.ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: message.callId,
      content: message.result,
    };
    const previous = out[out.length - 1];
    if (
      previous?.role === "user" &&
      Array.isArray(previous.content) &&
      previous.content.every((b) => typeof b === "object" && b.type === "tool_result")
    ) {
      (previous.content as Anthropic.ContentBlockParam[]).push(block);
    } else {
      out.push({ role: "user", content: [block] });
    }
  }

  return out;
}

/**
 * Requête de base, IDENTIQUE pour le comptage et pour l'appel.
 * L'appel n'y ajoute que `max_tokens` et `service_tier`, sans effet sur les
 * tokens d'entrée.
 */
export function buildBaseRequest(request: ModelRequest) {
  return {
    model: MODEL_ID,
    // Le prompt système et les outils sont identiques à chaque requête : le
    // cache éphémère 5 min (jamais 1 h) divise le coût d'entrée.
    system: [{ type: "text" as const, text: request.system, cache_control: { type: "ephemeral" as const } }],
    tools: request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    })),
    tool_choice: request.finalTurn ? ({ type: "none" } as const) : ({ type: "auto" } as const),
    messages: toAnthropicMessages(request.messages),
    output_config: { effort: AGENT_EFFORT },
  };
}

export function buildCreateParams(request: ModelRequest): Anthropic.MessageCreateParamsNonStreaming {
  return {
    ...buildBaseRequest(request),
    max_tokens: OUTPUT_CAP_TOKENS,
    service_tier: "standard_only",
  };
}

/** Attente demandée par Anthropic, en millisecondes (mêmes règles que le SDK). */
export function parseRetryAfterMs(headers: Headers | undefined | null, nowMs = Date.now()): number | undefined {
  if (!headers) return undefined;
  const ms = headers.get("retry-after-ms");
  if (ms !== null && ms.trim() !== "") {
    const value = Number.parseFloat(ms);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  const raw = headers.get("retry-after");
  if (raw === null || raw.trim() === "") return undefined;
  const seconds = Number(raw.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - nowMs);
  return undefined;
}

/**
 * Plafond de dépense explicite : erreur de facturation (402), ou message
 * d'Anthropic mentionnant une limite de dépense ou un crédit épuisé.
 */
function isExplicitSpendLimit(status: number, message: string): boolean {
  if (status === 402) return true;
  if (status !== 400 && status !== 429) return false;
  return /spend(ing)?[ _-]?limit|credit balance|usage limit/i.test(message);
}

/** Classe une erreur levée par le SDK. L'ordre compte : un abort est aussi une APIError. */
export function classifyError(error: unknown): ModelAttempt<never> {
  if (error instanceof Anthropic.APIUserAbortError) return { kind: "interrupted", cause: "aborted" };
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { kind: "interrupted", cause: "timeout" };
  if (error instanceof Anthropic.APIConnectionError) return { kind: "interrupted", cause: "network" };
  if (error instanceof Anthropic.APIError && typeof error.status === "number") {
    return {
      kind: "http_error",
      status: error.status,
      retryAfterMs: parseRetryAfterMs(error.headers),
      spendLimit: isExplicitSpendLimit(error.status, String(error.message ?? "")),
      anthropicRequestId: error.requestID ?? undefined,
    };
  }
  if (error instanceof Error && error.name === "AbortError") return { kind: "interrupted", cause: "aborted" };
  return { kind: "interrupted", cause: "exception" };
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  constructor(private readonly client: AnthropicLikeClient) {}

  async countTokens(request: ModelRequest, options: CallOptions): Promise<number> {
    const result = await this.client.messages.countTokens(buildBaseRequest(request), {
      signal: options.signal,
      timeout: options.timeoutMs,
    });
    return result.input_tokens;
  }

  async create(request: ModelRequest, options: CallOptions): Promise<ModelAttempt<ModelTurn>> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create(buildCreateParams(request), {
        signal: options.signal,
        timeout: options.timeoutMs,
      });
    } catch (error) {
      return classifyError(error);
    }

    let text = "";
    const calls: AgentToolCall[] = [];
    for (const block of response.content ?? []) {
      if (block.type === "text") text += block.text;
      if (block.type === "tool_use") {
        calls.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    const stopReason: AgentTurn["stopReason"] =
      response.stop_reason === "end_turn" ||
      response.stop_reason === "tool_use" ||
      response.stop_reason === "max_tokens" ||
      response.stop_reason === "refusal"
        ? response.stop_reason
        : "other";

    return {
      kind: "success",
      value: { text, calls, stopReason, responseId: response.id },
      usage: response.usage,
      anthropicRequestId: (response as { _request_id?: string | null })._request_id ?? undefined,
    };
  }
}

/** Client unique, sans aucun retry du SDK. */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({ maxRetries: 0 });
}

export function createAnthropicProvider(client: AnthropicLikeClient): LlmProvider {
  return new AnthropicProvider(client);
}

let cached: LlmProvider | null = null;

/** Point unique de sélection du fournisseur. */
export function getProvider(): LlmProvider {
  cached ??= createAnthropicProvider(createAnthropicClient());
  return cached;
}
