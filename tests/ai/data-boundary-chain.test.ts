import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { Listing } from "@/data/types";
import { CH_001, CH_009, FORBIDDEN, LEAKY } from "./fixtures/listings";

/**
 * Chaîne complète jusqu'à la frontière Anthropic, sans aucun appel réseau :
 * requête HTTP → gestionnaire (ADMIT, validation) → agent → outils réels →
 * DTO AI-safe → fournisseur Anthropic réel → client simulé. Seuls le client
 * Anthropic, Redis (FakeRedis) et Supabase sont remplacés. Le client enregistre
 * exactement ce que `messages.create` et `messages.countTokens` recevraient.
 */
const intercept = vi.hoisted(() => ({ listings: [] as Listing[] }));

vi.mock("@/lib/supabase/queries", () => ({
  getPublishedListings: async () => intercept.listings,
  getPublishedListingsByTransaction: async (t: string) =>
    intercept.listings.filter((l) => l.transaction === t),
  getPublishedListingBySlug: async (slug: string) =>
    intercept.listings.find((l) => l.slug === slug) ?? null,
  getNeighborhoods: async () => [],
}));

const { runAgent } = await import("@/lib/ai/agent");
const { createChatHandler } = await import("@/lib/ai/chat-handler");
const { createAnthropicProvider } = await import("@/lib/ai/provider");
const { financeKeys } = await import("@/lib/ai/finance/keys");
const { LOCATION_PLACEHOLDER } = await import("@/lib/ai/ai-safe");
const { FakeRedis } = await import("../finance/fake-redis");
const { TEST_HMAC_SECRET, newCircuit } = await import("../finance/helpers");
const { readSse } = await import("./helpers");

type Content = Anthropic.Message["content"];

function fakeClient(script: { content: unknown[]; stop_reason: string }[]) {
  const sent: unknown[] = [];
  const counted: unknown[] = [];
  const client = {
    messages: {
      countTokens: async (params: unknown) => {
        counted.push(structuredClone(params));
        return { input_tokens: 2_000 } as Anthropic.MessageTokensCount;
      },
      create: async (params: unknown) => {
        sent.push(structuredClone(params));
        const next = script.shift();
        if (!next) throw new Error("script épuisé");
        return {
          id: `msg_${sent.length}`,
          type: "message",
          role: "assistant",
          model: "claude-opus-5",
          content: next.content as Content,
          stop_reason: next.stop_reason,
          stop_sequence: null,
          usage: { input_tokens: 2_000, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        } as unknown as Anthropic.Message;
      },
    },
  };
  return { client, sent, counted };
}

const toolUse = (calls: { id: string; name: string; input: Record<string, unknown> }[]) => ({
  content: calls.map((c) => ({ type: "tool_use", ...c })),
  stop_reason: "tool_use",
});

describe("payload réellement transmis au client Anthropic (pipeline P4.2-B)", () => {
  it("aucun motif d'adresse ni champ interne ne franchit la frontière", async () => {
    intercept.listings = [...LEAKY, CH_001, CH_009];
    const redis = new FakeRedis(Date.now());
    const circuit = newCircuit(redis);
    const keys = financeKeys("test");
    const { client, sent, counted } = fakeClient([
      toolUse([
        { id: "toolu_1", name: "search_properties", input: { transaction: "location" } },
        { id: "toolu_2", name: "search_properties", input: { transaction: "vente" } },
      ]),
      toolUse([
        { id: "toolu_3", name: "get_property_details", input: { slug: CH_009.slug } },
        { id: "toolu_4", name: "request_human_contact", input: { reference: CH_009.reference } },
      ]),
      { content: [{ type: "text", text: "Réponse finale simulée." }], stop_reason: "end_turn" },
    ]);

    const handle = createChatHandler(() => ({
      enabled: true,
      circuit,
      provider: createAnthropicProvider(client),
      visitorSecret: TEST_HMAC_SECRET,
      now: () => Date.now(),
      log: () => {},
      newRequestId: randomUUID,
      runAgent,
      sleep: async () => {},
    }));

    const response = await handle(
      new Request("https://www.casahabitatmaroc.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
        body: JSON.stringify({ message: "Je cherche un appartement.", history: [] }),
      })
    );
    const events = await readSse(response);

    expect(events.find((e) => e.type === "message")).toEqual({ type: "message", text: "Réponse finale simulée." });
    expect(sent).toHaveLength(3);
    expect(counted).toHaveLength(3);

    // Frontière : rien d'interdit dans ce qui part vers Anthropic.
    const wire = JSON.stringify([sent, counted]);
    for (const pattern of FORBIDDEN) expect(wire).not.toMatch(pattern);

    // Les résultats d'outils sont bien arrivés, masqués et utiles.
    const last = JSON.stringify(sent.at(-1));
    for (const ref of ["CH-901", "CH-902", "CH-903", "CH-001", "CH-009"]) expect(last).toContain(ref);
    expect(last).toContain(LOCATION_PLACEHOLDER);
    expect(last).toContain("1 place de parking sécurisée");
    expect(last).toContain("au cœur du quartier Racine");
    expect(last).toContain("wa.me");

    // Circuit financier : trois appels réglés, place libérée.
    expect(redis.peekNumber(keys.spendDay(Date.now()))).toBeGreaterThan(0);
    expect(redis.zcard(keys.concurrencyGlobal)).toBe(0);
  });
});
