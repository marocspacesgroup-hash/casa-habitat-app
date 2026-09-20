import { vi } from "vitest";
import type { CallOptions, ModelAttempt } from "@/lib/ai/finance/guarded-call";
import type { LlmProvider, ModelRequest, ModelTurn } from "@/lib/ai/provider";
import type { AgentToolCall } from "@/lib/ai/types";

export const usage = { input_tokens: 1_000, output_tokens: 100, cache_read_input_tokens: 4_000, cache_creation_input_tokens: 0 };

export function textTurn(text: string): ModelAttempt<ModelTurn> {
  return { kind: "success", value: { text, calls: [], stopReason: "end_turn" }, usage };
}

export function toolTurn(calls: AgentToolCall[], text = ""): ModelAttempt<ModelTurn> {
  return { kind: "success", value: { text, calls, stopReason: "tool_use" }, usage };
}

export function call(name: string, input: Record<string, unknown> = {}, n = Math.random()): AgentToolCall {
  return { id: `toolu_${String(n).replace(".", "")}`, name, input };
}

export interface RecordedCall {
  request: ModelRequest;
  options: CallOptions;
}

/**
 * Fournisseur simulé : chaque appel à `create` consomme le script suivant
 * (ou appelle `onCreate` s'il est fourni). Enregistre requêtes et options.
 */
export function fakeProvider(script: (ModelAttempt<ModelTurn> | ((o: CallOptions) => Promise<ModelAttempt<ModelTurn>>))[] = []) {
  const queue = [...script];
  const creates: RecordedCall[] = [];
  const counts: RecordedCall[] = [];
  const provider: LlmProvider = {
    name: "fake",
    countTokens: vi.fn(async (request: ModelRequest, options: CallOptions) => {
      counts.push({ request: structuredClone(request), options });
      return 5_000;
    }),
    create: vi.fn(async (request: ModelRequest, options: CallOptions) => {
      creates.push({ request: structuredClone(request), options });
      const next = queue.shift();
      if (!next) return textTurn("Réponse par défaut.");
      return typeof next === "function" ? next(options) : next;
    }),
  };
  return { provider, creates, counts };
}

/** Lit un flux SSE complet et renvoie les événements. */
export async function readSse(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("data:"))
    .map((chunk) => JSON.parse(chunk.slice(5).trim()) as Record<string, unknown>);
}

export const TOOL_DEFINITIONS_STUB = [
  { name: "search_properties", description: "Recherche.", inputSchema: { type: "object", properties: {} } },
  { name: "get_property_details", description: "Détail.", inputSchema: { type: "object", properties: {} } },
  { name: "request_human_contact", description: "Contact.", inputSchema: { type: "object", properties: {} } },
];
