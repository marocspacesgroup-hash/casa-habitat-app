import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/tools", async () => {
  const { TOOL_DEFINITIONS_STUB } = await import("./helpers");
  return {
    TOOL_DEFINITIONS: TOOL_DEFINITIONS_STUB,
    searchProperties: vi.fn(),
    getPropertyDetails: vi.fn(),
    requestHumanContact: vi.fn(),
  };
});

import { boundToolResult, runAgent, type AgentEvent, type ToolExecutor } from "@/lib/ai/agent";
import type { FinanceCircuit } from "@/lib/ai/finance/circuit";
import { financeKeys } from "@/lib/ai/finance/keys";
import { TOOL_RESULT_MAX_BYTES } from "@/lib/ai/finance/limits";
import type { LlmProvider } from "@/lib/ai/provider";
import { FakeRedis } from "../finance/fake-redis";
import { admitOk, newCircuit, vid } from "../finance/helpers";
import { call, fakeProvider, textTurn, toolTurn } from "./helpers";

const keys = financeKeys("test");
const VISITOR = vid("agent");

let redis: FakeRedis;
let circuit: FinanceCircuit;
let requestId: string;

beforeEach(async () => {
  redis = new FakeRedis(Date.UTC(2026, 8, 17, 10, 0, 0));
  circuit = newCircuit(redis);
  requestId = await admitOk(circuit, redis, VISITOR);
});

async function collect(options: {
  provider: LlmProvider;
  remainingMs?: number;
  executeTool?: ToolExecutor;
  signal?: AbortSignal;
  now?: () => number;
}): Promise<AgentEvent[]> {
  const now = options.now ?? (() => redis.now());
  const events: AgentEvent[] = [];
  for await (const event of runAgent({
    message: "Je cherche un appartement",
    history: [],
    signal: options.signal ?? new AbortController().signal,
    deadlineAt: now() + (options.remainingMs ?? 200_000),
    requestId,
    visitor: VISITOR,
    deps: {
      provider: options.provider,
      circuit,
      now,
      executeTool: options.executeTool ?? (async () => ({ count: 0, properties: [] })),
      sleep: async () => {},
    },
  })) {
    events.push(event);
  }
  return events;
}

describe("nombre de tours", () => {
  it("au plus 3 tours ; le 3e est final (tool_choice none), aucun outil exécuté au 3e", async () => {
    const executeTool = vi.fn(async () => ({ count: 0, properties: [] }));
    const { provider, creates } = fakeProvider([
      toolTurn([call("search_properties", { a: 1 }, 1)]),
      toolTurn([call("search_properties", { a: 2 }, 2)]),
      toolTurn([call("search_properties", { a: 3 }, 3)], "Voici ce que j'ai trouvé."),
      textTurn("jamais"),
    ]);
    const events = await collect({ provider, executeTool });
    expect(creates).toHaveLength(3);
    expect(creates.map((c) => c.request.finalTurn)).toEqual([false, false, true]);
    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toEqual({ type: "message", text: "Voici ce que j'ai trouvé." });
  });

  it("variables AI_AGENT_MAX_TURNS=12 et AI_AGENT_MODEL ignorées", async () => {
    vi.stubEnv("AI_AGENT_MAX_TURNS", "12");
    vi.stubEnv("AI_AGENT_MODEL", "claude-fable-5-1");
    vi.resetModules();
    const config = await import("@/lib/ai/config");
    expect(config.MAX_TURNS).toBe(3);
    expect(config.AGENT_MODEL).toBe("claude-opus-5");
    expect(config.MAX_OUTPUT_TOKENS).toBe(1_500);
    vi.unstubAllEnvs();
  });

  it("tour final vide d'outils mais sans texte : pas d'outil, réponse « no_answer »", async () => {
    const executeTool = vi.fn(async () => ({ count: 0, properties: [] }));
    const { provider } = fakeProvider([
      toolTurn([call("search_properties", {}, 1)]),
      toolTurn([call("search_properties", { b: 1 }, 2)]),
      toolTurn([call("search_properties", { c: 1 }, 3)], ""),
    ]);
    const events = await collect({ provider, executeTool });
    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toEqual({ type: "error", code: "no_answer" });
  });
});

describe("échéance", () => {
  it("moins de 53 s restantes : aucun appel", async () => {
    const { provider, creates, counts } = fakeProvider();
    const events = await collect({ provider, remainingMs: 52_999 });
    expect(counts).toHaveLength(0);
    expect(creates).toHaveLength(0);
    expect(events).toEqual([{ type: "error", code: "no_answer" }]);
  });

  it("moins de 121 s restantes au 1er tour : tour final, aucun outil", async () => {
    const executeTool = vi.fn();
    const { provider, creates } = fakeProvider([toolTurn([call("search_properties", {}, 1)], "Réponse directe.")]);
    const events = await collect({ provider, remainingMs: 120_999, executeTool });
    expect(creates).toHaveLength(1);
    expect(creates[0].request.finalTurn).toBe(true);
    expect(executeTool).not.toHaveBeenCalled();
    expect(events).toEqual([{ type: "message", text: "Réponse directe." }]);
  });

  it("121 s restantes : tour non final", async () => {
    const { provider, creates } = fakeProvider([textTurn("ok")]);
    await collect({ provider, remainingMs: 121_000 });
    expect(creates[0].request.finalTurn).toBe(false);
  });

  it("la même échéance absolue est utilisée à chaque tour (aucune réinitialisation)", async () => {
    let clock = redis.now();
    const now = () => clock;
    const { provider, creates } = fakeProvider([
      async () => {
        clock += 60_000;
        return toolTurn([call("search_properties", {}, 1)]);
      },
      async () => {
        clock += 10_000;
        return textTurn("fin");
      },
    ]);
    const events = await collect({ provider, remainingMs: 200_000, now });
    // Tour 1 à 200 s restantes ; tour 2 à ≈ 140 s : toujours non final mais plus court.
    expect(creates).toHaveLength(2);
    expect(creates[1].options.timeoutMs).toBe(45_000);
    expect(events.at(-1)).toEqual({ type: "message", text: "fin" });

    clock = redis.now();
    const second = fakeProvider([
      async () => {
        clock += 90_000;
        return toolTurn([call("search_properties", {}, 5)]);
      },
      textTurn("réponse finale"),
    ]);
    // Nouvelle requête du même visiteur (la place visiteur doit correspondre, D3).
    requestId = await admitOk(circuit, redis, VISITOR);
    await collect({ provider: second.provider, remainingMs: 200_000, now });
    // Après 90 s, il reste 110 s < 121 s : le 2e tour devient final.
    expect(second.creates.map((c) => c.request.finalTurn)).toEqual([false, true]);
  });
});

describe("outils", () => {
  it("3 outils par tour, 4 par requête", async () => {
    const executeTool = vi.fn(async () => ({ count: 0, properties: [] }));
    const { provider } = fakeProvider([
      toolTurn([1, 2, 3, 4].map((n) => call("search_properties", { n }, n))),
      toolTurn([5, 6].map((n) => call("search_properties", { n }, n))),
      textTurn("fin"),
    ]);
    await collect({ provider, executeTool });
    expect(executeTool).toHaveBeenCalledTimes(4);
  });

  it("12 biens au plus par requête, recherche et détail confondus", async () => {
    const remaining: number[] = [];
    const executeTool: ToolExecutor = async (c, remainingResults) => {
      remaining.push(remainingResults);
      if (c.name === "get_property_details") return { found: true, property: { reference: "CH-1" } };
      const n = Math.min(5, remainingResults);
      return { count: 10, properties: Array.from({ length: n }, (_, i) => ({ reference: `CH-${i}` })) };
    };
    const { provider } = fakeProvider([
      toolTurn([call("search_properties", { a: 1 }, 1), call("search_properties", { a: 2 }, 2), call("get_property_details", { s: 1 }, 3)]),
      toolTurn([call("search_properties", { a: 3 }, 4)]),
      textTurn("fin"),
    ]);
    await collect({ provider, executeTool });
    expect(remaining).toEqual([12, 7, 2, 1]);
  });

  it("résultat > 6 Ko : biens retirés en fin de liste, JSON valide", async () => {
    const big = "x".repeat(2_000);
    const { json, properties } = boundToolResult({
      count: 5,
      properties: Array.from({ length: 5 }, (_, i) => ({ reference: `CH-${i}`, description: big })),
    });
    expect(Buffer.byteLength(json)).toBeLessThanOrEqual(TOOL_RESULT_MAX_BYTES);
    expect(properties).toBeLessThan(5);
    expect(JSON.parse(json).properties).toHaveLength(properties);
    expect(JSON.parse(json).note).toContain("tronqué");
  });

  it("résultat non listable > 6 Ko : erreur courte", () => {
    const { json } = boundToolResult({ found: true, property: { description: "y".repeat(10_000) } });
    expect(JSON.parse(json)).toHaveProperty("error");
  });

  it("outil bloqué : abandonné après 15 s, la conversation continue", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 8, 17, 10, 0, 0));
    try {
      const executeTool = vi.fn(() => new Promise<Record<string, unknown>>(() => {}));
      const { provider, creates } = fakeProvider([toolTurn([call("search_properties", {}, 1)]), textTurn("Catalogue indisponible.")]);
      const done = collect({ provider, executeTool, now: () => Date.now() });
      await vi.advanceTimersByTimeAsync(15_001);
      const events = await done;
      expect(creates).toHaveLength(2);
      const toolMessage = creates[1].request.messages.find((m) => m.role === "tool");
      expect(toolMessage && "result" in toolMessage ? toolMessage.result : "").toContain("indisponible");
      expect(events.at(-1)).toEqual({ type: "message", text: "Catalogue indisponible." });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("contrôle financier", () => {
  it("réservation refusée : aucun appel au fournisseur", async () => {
    redis.set(keys.spendDay(redis.now()), "8900000000", 3600);
    const { provider, creates } = fakeProvider([textTurn("jamais")]);
    const events = await collect({ provider });
    expect(creates).toHaveLength(0);
    expect(events).toEqual([{ type: "error", code: "disabled" }]);
  });

  it("chaque tour réserve puis règle (aucun appel sans réservation)", async () => {
    const reserve = vi.spyOn(circuit, "reserve");
    const settle = vi.spyOn(circuit, "settle");
    const { provider, creates } = fakeProvider([toolTurn([call("search_properties", {}, 1)]), textTurn("fin")]);
    await collect({ provider });
    expect(creates).toHaveLength(2);
    expect(reserve).toHaveBeenCalledTimes(2);
    expect(settle).toHaveBeenCalledTimes(2);
  });

  it("outil renvoyant un résultat invalide : erreur de catalogue, pas de plantage", async () => {
    const executeTool = vi.fn(async () => undefined as unknown as Record<string, unknown>);
    const { provider, creates } = fakeProvider([toolTurn([call("search_properties", {}, 1)]), textTurn("fin")]);
    const events = await collect({ provider, executeTool });
    expect(creates).toHaveLength(2);
    expect(events.at(-1)).toEqual({ type: "message", text: "fin" });
  });

  it("requête d'un autre visiteur : RESERVE refuse, aucun appel (D3)", async () => {
    const other = await admitOk(circuit, redis, vid("autre"));
    requestId = other;
    const { provider, creates } = fakeProvider([textTurn("jamais")]);
    await collect({ provider });
    expect(creates).toHaveLength(0);
  });

  it("annulation pendant un outil : aucun tour suivant", async () => {
    const controller = new AbortController();
    const executeTool = vi.fn(async () => {
      controller.abort();
      return new Promise<Record<string, unknown>>(() => {});
    });
    const { provider, creates } = fakeProvider([toolTurn([call("search_properties", {}, 1)]), textTurn("jamais")]);
    await collect({ provider, executeTool, signal: controller.signal });
    expect(creates).toHaveLength(1);
  });
});
