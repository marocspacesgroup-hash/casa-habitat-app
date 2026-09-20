import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/tools", async () => {
  const { TOOL_DEFINITIONS_STUB } = await import("./helpers");
  return {
    TOOL_DEFINITIONS: TOOL_DEFINITIONS_STUB,
    searchProperties: vi.fn(),
    getPropertyDetails: vi.fn(),
    requestHumanContact: vi.fn(),
  };
});

import { randomUUID } from "node:crypto";
import { runAgent } from "@/lib/ai/agent";
import { createChatHandler, structuredLog } from "@/lib/ai/chat-handler";
import { createFinanceCircuit, type FinanceCircuit } from "@/lib/ai/finance/circuit";
import { financeKeys } from "@/lib/ai/finance/keys";
import { RESERVATION_NANO } from "@/lib/ai/finance/limits";
import { CANCEL_SCRIPT, RELEASE_SCRIPT, RESERVE_SCRIPT, SETTLE_SCRIPT } from "@/lib/ai/finance/scripts";
import { FakeRedis } from "../finance/fake-redis";
import { faultyStore, SLOW_FAULT_MS, type Fault } from "../finance/fault-store";
import { TEST_HMAC_SECRET } from "../finance/helpers";
import { fakeProvider, readSse, textTurn, usage } from "./helpers";

/**
 * RELEASE fiable et reprise différée au niveau du handler HTTP (C.3.3).
 * Les journaux sont ceux de PRODUCTION (`structuredLog`, liste blanche) :
 * leur sortie réelle est capturée puis inspectée.
 */

const keys = financeKeys("test");
const MESSAGE = "Je cherche un appartement lumineux";
const ANSWER = "Voici une réponse détaillée du conseiller.";
const COST = usage.input_tokens * 5_500 + usage.cache_read_input_tokens * 550 + usage.output_tokens * 27_500;

let lines: string[];
let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  lines = [];
  info = vi.spyOn(console, "info").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
});
afterEach(() => info.mockRestore());

function setup(plan: Record<string, Fault[]>, options: { defer?: boolean; timeoutMs?: number } = {}) {
  const redis = new FakeRedis(Date.now());
  const circuit: FinanceCircuit = createFinanceCircuit(faultyStore(redis, new Map(Object.entries(plan)), options.timeoutMs), "test");
  const { provider } = fakeProvider([textTurn(ANSWER)]);
  const tasks: (() => Promise<void>)[] = [];
  const handle = createChatHandler(() => ({
    enabled: true,
    circuit,
    provider,
    visitorSecret: TEST_HMAC_SECRET,
    now: () => Date.now(),
    log: structuredLog,
    newRequestId: randomUUID,
    runAgent,
    sleep: async () => {},
    ...(options.defer === false ? {} : { defer: (task: () => Promise<void>) => tasks.push(task) }),
  }));
  const post = () =>
    handle(
      new Request("https://www.casahabitatmaroc.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
        body: JSON.stringify({ message: MESSAGE }),
      })
    );
  const logs = () => lines.map((l) => JSON.parse(l) as Record<string, unknown>);
  const events = () => logs().map((l) => l.event);
  const day = () => redis.peekNumber(keys.spendDay(Date.now()));
  const slots = () => redis.zcard(keys.concurrencyGlobal);
  return { redis, circuit, provider, tasks, post, logs, events, day, slots };
}

describe("RELEASE — relance et rejeu", () => {
  it("#10 succès immédiat : aucune place restante, aucun événement de réconciliation", async () => {
    const s = setup({});
    const events = await readSse(await s.post());
    expect(events.find((e) => e.type === "message")).toEqual({ type: "message", text: ANSWER });
    expect(s.slots()).toBe(0);
    expect(s.events()).toEqual(["model_call"]);
    expect(s.day()).toBe(COST);
  });

  it("#11 #13 timeout AVANT exécution → relance → libérée (2 places retirées)", async () => {
    const s = setup({ [RELEASE_SCRIPT]: ["timeout_before"] });
    await readSse(await s.post());
    expect(s.events()).toEqual(["model_call", "release_failed", "release_retry", "released"]);
    expect(s.logs()[1]).toMatchObject({ operation: "release", attempt: 1, reason: "store_unavailable", retryable: true, storeKind: "timeout", timeoutMs: 30 });
    expect(s.logs()[3]).toMatchObject({ attempt: 2, slotsRemoved: 2 });
    expect(s.slots()).toBe(0);
    expect(s.tasks).toHaveLength(0);
  });

  it("#12 #14 timeout APRÈS exécution → relance → rejeu (0 place retirée), aucun effet financier", async () => {
    const s = setup({ [RELEASE_SCRIPT]: ["timeout_after"] });
    await readSse(await s.post());
    expect(s.logs().at(-1)).toMatchObject({ event: "released", attempt: 2, slotsRemoved: 0 });
    expect(s.slots()).toBe(0);
    expect(s.day()).toBe(COST);
  });

  it("#15 double échec → reprise différée → libérée ; la reprise n'appelle ni RESERVE ni le modèle", async () => {
    const s = setup({ [RELEASE_SCRIPT]: ["timeout_before", "timeout_before", "timeout_before"] });
    await readSse(await s.post());
    expect(s.events()).toEqual(["model_call", "release_failed", "release_retry", "release_failed", "release_deferred"]);
    expect(s.slots()).toBe(1);
    const reserve = vi.spyOn(s.circuit, "reserve");
    const creates = vi.mocked(s.provider.create).mock.calls.length;
    for (const task of s.tasks) await task();
    expect(s.events().slice(5)).toEqual(["release_failed", "released"]);
    expect(s.logs().at(-1)).toMatchObject({ attempt: 4, slotsRemoved: 2, deferred: true });
    expect(s.slots()).toBe(0);
    expect(reserve).not.toHaveBeenCalled();
    expect(vi.mocked(s.provider.create).mock.calls.length).toBe(creates);
    expect(s.day()).toBe(COST);
  });

  it("sans `defer` : release_abandoned no_defer ; la place expire d'elle-même", async () => {
    const s = setup({ [RELEASE_SCRIPT]: ["timeout_before", "timeout_before"] }, { defer: false });
    await readSse(await s.post());
    expect(s.logs().at(-1)).toMatchObject({ event: "release_abandoned", reason: "no_defer", attempt: 2 });
    expect(s.slots()).toBe(1);
  });
});

describe("SETTLE + RELEASE combinés", () => {
  it("#16 SETTLE en échec (2 tentatives) + RELEASE : place libérée, règlement repris après la réponse", async () => {
    const s = setup({ [SETTLE_SCRIPT]: ["timeout_before", "timeout_before"] });
    await readSse(await s.post());
    expect(s.events()).toEqual([
      "finance_settle_failed",
      "finance_settle_retry",
      "finance_settle_failed",
      "finance_settle_deferred",
      "model_call",
    ]);
    expect(s.slots()).toBe(0);
    expect(s.day()).toBe(RESERVATION_NANO);
    for (const task of s.tasks) await task();
    expect(s.logs().at(-1)).toMatchObject({ event: "finance_settled", attempt: 3, outcome: "settled", deferred: true });
    expect(s.day()).toBe(COST);
  });

  it("#17 SETTLE réussi + RELEASE en timeout → RELEASE relancé ; finance exacte", async () => {
    const s = setup({ [RELEASE_SCRIPT]: ["timeout_after"] });
    await readSse(await s.post());
    expect(s.day()).toBe(COST);
    expect(s.slots()).toBe(0);
  });

  it("#18 SETTLE timeout + relance réglée + RELEASE : chaîne complète corrélée par requestId/callId", async () => {
    const s = setup({ [SETTLE_SCRIPT]: ["timeout_after"] });
    await readSse(await s.post());
    const chain = s.logs();
    expect(chain.map((l) => l.event)).toEqual(["finance_settle_failed", "finance_settle_retry", "finance_settled", "model_call"]);
    const requestIds = new Set(chain.map((l) => l.requestId));
    const callIds = new Set(chain.map((l) => l.callId));
    expect(requestIds.size).toBe(1);
    expect(callIds.size).toBe(1);
    expect(chain[2]).toMatchObject({ outcome: "replay", attempt: 2 });
    expect(s.day()).toBe(COST);
  });
});

describe("journaux (#27)", () => {
  it("aucun message brut, clé Redis, HMAC complet, IP, message ni réponse dans la sortie réelle", async () => {
    const s = setup({
      [SETTLE_SCRIPT]: ["upstash", "network", "upstash"],
      [RELEASE_SCRIPT]: ["upstash", "network", "upstash"],
    });
    await readSse(await s.post());
    for (const task of s.tasks) await task();
    const output = lines.join("\n");
    expect(lines.length).toBeGreaterThan(5);
    expect(output).not.toContain("{ch:ai:");
    expect(output).not.toContain("command was");
    expect(output).not.toContain("socket hang up");
    expect(output).not.toMatch(/[0-9a-f]{64}/);
    expect(output).not.toContain("198.51.100");
    expect(output).not.toContain(MESSAGE);
    expect(output).not.toContain(ANSWER);
    expect(output).not.toContain(TEST_HMAC_SECRET);
    expect(output).toContain('"errorClass":"UpstashError"');
    expect(output).toContain('"errorCode":"ECONNRESET"');
  });
});

describe("RESERVE incertain → CANCEL ≤ 250 ms → refus → after()", () => {
  it("refus HTTP rendu sans attendre CANCEL ; after() termine le même CANCEL ; ni RESERVE ni modèle", async () => {
    const s = setup({ [RESERVE_SCRIPT]: ["bad_reply"], [CANCEL_SCRIPT]: ["slow_after"] }, { timeoutMs: 1_000 });
    const started = Date.now();
    const events = await readSse(await s.post());
    const responseMs = Date.now() - started;
    expect(events.map((e) => e.type)).toEqual(["error", "done"]);
    expect(responseMs).toBeLessThan(SLOW_FAULT_MS);
    // À la fin de la réponse : CANCEL non encore exécuté, réservation comptée, place libérée.
    expect(s.day()).toBe(RESERVATION_NANO);
    expect(s.slots()).toBe(0);
    expect(s.events()).toEqual(["finance_reserve_failed", "finance_cancel_pending", "model_call"]);
    expect(s.logs()[1]).toMatchObject({ operation: "cancel", waitMs: 250, deferred: true });
    expect(s.logs()[2]).toMatchObject({ status: "refused", reason: "store_unavailable" });
    expect(vi.mocked(s.provider.create)).not.toHaveBeenCalled();
    const reserve = vi.spyOn(s.circuit, "reserve");
    const settle = vi.spyOn(s.circuit, "settle");
    for (const task of s.tasks) await task();
    expect(s.logs().at(-1)).toMatchObject({ event: "finance_cancelled", operation: "cancel", attempt: 1, outcome: "refunded", refundedNano: RESERVATION_NANO, deferred: true });
    expect(s.day()).toBe(0);
    expect(reserve).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
    expect(vi.mocked(s.provider.create)).not.toHaveBeenCalled();
    // Même callId sur toute la chaîne.
    expect(new Set(s.logs().filter((l) => String(l.event).startsWith("finance_")).map((l) => l.callId)).size).toBe(1);
    const output = lines.join("\n");
    expect(output).not.toContain("{ch:ai:");
    expect(output).not.toMatch(/[0-9a-f]{64}/);
    expect(output).not.toContain("198.51.100");
    expect(output).not.toContain(MESSAGE);
  });

  it("continuation jamais exécutée (processus interrompu) : état prudent, réservation comptée", async () => {
    const s = setup({ [RESERVE_SCRIPT]: ["bad_reply"], [CANCEL_SCRIPT]: ["timeout_before"] }, { timeoutMs: 1_000 });
    await readSse(await s.post());
    expect(s.tasks).toHaveLength(1);
    // La tâche after() n'est pas exécutée (arrêt du processus).
    expect(s.day()).toBe(RESERVATION_NANO);
    expect(s.events()).toContain("finance_cancel_pending");
    expect(s.events()).not.toContain("finance_cancelled");
    expect(vi.mocked(s.provider.create)).not.toHaveBeenCalled();
  });
});
