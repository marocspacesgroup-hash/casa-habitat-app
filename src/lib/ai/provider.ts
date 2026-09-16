import Anthropic from "@anthropic-ai/sdk";
import { AGENT_EFFORT, AGENT_MODEL, MAX_OUTPUT_TOKENS } from "./config";
import type { AgentMessage, AgentToolDefinition, AgentTurn } from "./types";

/**
 * Interface interne du fournisseur de modèle.
 *
 * Tout le reste de l'agent ne connaît que ce contrat. Changer de fournisseur
 * revient à écrire une seconde implémentation de `LlmProvider` et à modifier
 * la seule ligne de `getProvider()` — aucun autre fichier n'est concerné.
 */
export interface LlmProvider {
  readonly name: string;
  run(params: {
    system: string;
    messages: AgentMessage[];
    tools: AgentToolDefinition[];
    signal?: AbortSignal;
  }): Promise<AgentTurn>;
}

/** Erreur fournisseur normalisée — jamais renvoyée telle quelle au visiteur. */
export class LlmError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "LlmError";
  }
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

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  // Le SDK réessaie deux fois par défaut. Avec six tours possibles, une seule
  // requête entrante pouvait donc provoquer jusqu'à dix-huit tentatives
  // réseau. Un réessai suffit à absorber un incident passager et ramène ce
  // pire cas à douze.
  private client = new Anthropic({ maxRetries: 1 });

  async run({
    system,
    messages,
    tools,
    signal,
  }: {
    system: string;
    messages: AgentMessage[];
    tools: AgentToolDefinition[];
    signal?: AbortSignal;
  }): Promise<AgentTurn> {
    try {
      const response = await this.client.messages.create(
        {
          model: AGENT_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: AGENT_EFFORT },
          // Le prompt système et les définitions d'outils sont identiques à
          // chaque requête : les mettre en cache divise le coût d'entrée.
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
          })),
          messages: toAnthropicMessages(messages),
        },
        { signal }
      );

      let text = "";
      const calls: AgentTurn["calls"] = [];
      for (const block of response.content) {
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

      return { text, calls, stopReason };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new LlmError("rate_limited", true);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new LlmError("connection", true);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LlmError("auth", false);
      }
      if (error instanceof Anthropic.APIError) {
        throw new LlmError(`api_${error.status ?? "unknown"}`, (error.status ?? 500) >= 500);
      }
      throw new LlmError("unknown", false);
    }
  }
}

let cached: LlmProvider | null = null;

/** Point unique de sélection du fournisseur. */
export function getProvider(): LlmProvider {
  cached ??= new AnthropicProvider();
  return cached;
}
