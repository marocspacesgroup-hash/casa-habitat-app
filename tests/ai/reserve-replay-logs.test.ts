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

import { runAgent } from "@/lib/ai/agent";
import { createChatHandler, structuredLog } from "@/lib/ai/chat-handler";
import { createFinanceCircuit } from "@/lib/ai/finance/circuit";
import { RESERVE_SCRIPT } from "@/lib/ai/finance/scripts";
import { hashVisitorIdentity } from "@/lib/ai/finance/visitor";
import { FakeRedis } from "../finance/fake-redis";
import { faultyStore, type Fault } from "../finance/fault-store";
import { TEST_HMAC_SECRET } from "../finance/helpers";
import { fakeProvider, readSse, textTurn } from "./helpers";

/**
 * R1 (I) — journaux RÉELS (`structuredLog`) des chemins `reserve_failed`
 * (replay interne) et `reserve_duplicate` (état préexistant).
 */

const MESSAGE = "Je cherche un studio calme";
const IP = "198.51.100.61";
const REQUEST_ID = "3f0c6a2e-9d41-4b7a-8c55-1e2f3a4b5c6d";

let lines: string[];
let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  lines = [];
  info = vi.spyOn(console, "info").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
});
afterEach(() => info.mockRestore());

function setup(reserveFaults: Fault[]) {
  const redis = new FakeRedis(Date.now());
  const circuit = createFinanceCircuit(faultyStore(redis, new Map([[RESERVE_SCRIPT, reserveFaults]])), "test");
  const { provider } = fakeProvider([textTurn("Réponse du conseiller.")]);
  const handle = createChatHandler(() => ({
    enabled: true,
    circuit,
    provider,
    visitorSecret: TEST_HMAC_SECRET,
    now: () => Date.now(),
    log: structuredLog,
    newRequestId: () => REQUEST_ID,
    runAgent,
    sleep: async () => {},
    defer: () => {},
  }));
  const post = () =>
    handle(
      new Request("https://www.casahabitatmaroc.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": IP },
        body: JSON.stringify({ message: MESSAGE }),
      })
    );
  return { redis, circuit, provider, post, logs: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>) };
}

function expectClean(output: string) {
  expect(output).not.toContain("{ch:ai:");
  expect(output).not.toContain("EVAL");
  expect(output).not.toContain("redis.call");
  expect(output).not.toMatch(/[0-9a-f]{64}/);
  expect(output).not.toContain(IP);
  expect(output).not.toContain("198.51.100");
  expect(output).not.toContain(MESSAGE);
  expect(output).not.toContain("Réponse du conseiller");
  expect(output).not.toContain(TEST_HMAC_SECRET);
  expect(output).not.toContain("jeton");
}

describe("R1 — journaux", () => {
  it("reserve_failed (replay interne) : diagnostic en liste blanche, aucune fuite", async () => {
    const s = setup(["applied_then_retry"]);
    await readSse(await s.post());
    const failed = s.logs().find((l) => l.event === "finance_reserve_failed");
    expect(failed).toEqual({
      scope: "ai.chat",
      event: "finance_reserve_failed",
      requestId: REQUEST_ID,
      callId: `${REQUEST_ID}-t1`,
      operation: "reserve",
      storeKind: "replayed",
      errorClass: "ReserveReplay",
      elapsedMs: expect.any(Number),
      timeoutMs: 1_500,
      httpAttempts: 2,
    });
    expect(s.logs().map((l) => l.event)).toContain("finance_cancelled");
    expect(vi.mocked(s.provider.create)).not.toHaveBeenCalled();
    expectClean(lines.join("\n"));
  });

  it("reserve_duplicate (état préexistant) : champs minimaux, aucun CANCEL, aucune fuite", async () => {
    const s = setup([]);
    const visitor = hashVisitorIdentity(`v4:${IP}`, TEST_HMAC_SECRET);
    await s.circuit.admit({ requestId: REQUEST_ID, visitor, nowMs: Date.now() });
    const pre = await s.circuit.reserve({ callId: `${REQUEST_ID}-t1`, requestId: REQUEST_ID, visitor, nowMs: Date.now() });
    expect(pre.allowed).toBe(true);
    const cancel = vi.spyOn(s.circuit, "cancel");
    await readSse(await s.post());
    const duplicate = s.logs().find((l) => l.event === "finance_reserve_duplicate");
    expect(duplicate).toEqual({
      scope: "ai.chat",
      event: "finance_reserve_duplicate",
      requestId: REQUEST_ID,
      callId: `${REQUEST_ID}-t1`,
      operation: "reserve",
      reason: "duplicate_call",
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(s.logs().map((l) => l.event)).not.toContain("finance_cancelled");
    expect(vi.mocked(s.provider.create)).not.toHaveBeenCalled();
    expectClean(lines.join("\n"));
  });
});
