import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFinanceCircuit, type FinanceCircuit, type Reservation } from "@/lib/ai/finance/circuit";
import { runGuardedModelCall, type FinanceEvent, type ModelAttempt } from "@/lib/ai/finance/guarded-call";
import { financeKeys } from "@/lib/ai/finance/keys";
import { RESERVATION_NANO } from "@/lib/ai/finance/limits";
import { CANCEL_SCRIPT, RESERVE_SCRIPT } from "@/lib/ai/finance/scripts";
import { createUpstashStore } from "@/lib/ai/finance/store";
import { FakeRedis } from "./fake-redis";
import { faultyStore, SLOW_FAULT_MS, type Fault } from "./fault-store";
import { admitOk, id, vid } from "./helpers";

/**
 * R1 — RESERVE rejoué par la relance du SDK (C.3.5-R1).
 *   replay + httpAttempts ≥ 2 → réservation incertaine → CANCEL (architecture C.3.4) ;
 *   replay + httpAttempts ≤ 1 → duplicate_call inchangé + alerte reserve_duplicate, AUCUN CANCEL.
 * Une dépense de référence COST non nulle rend visible tout remboursement en trop.
 */

const keys = financeKeys("test");
const VISITOR = vid("reserve-replay");
const usage = { input_tokens: 2_000, output_tokens: 300, cache_read_input_tokens: 4_406, cache_creation_input_tokens: 0 };
const COST = 2_000 * 5_500 + 4_406 * 550 + 300 * 27_500;

function counters(redis: FakeRedis) {
  return {
    day: redis.peekNumber(keys.spendDay(redis.now())),
    hour: redis.peekNumber(keys.spendHour(redis.now())),
    visitor: redis.peekNumber(keys.spendVisitorDay(VISITOR, redis.now())),
  };
}
const REFERENCE = { day: COST, hour: COST, visitor: COST };

/** Pose la dépense de référence : un autre appel réservé puis réglé à COST. */
async function reference(circuit: FinanceCircuit, redis: FakeRedis) {
  const requestId = await admitOk(circuit, redis, VISITOR);
  const base = await circuit.reserve({ callId: id("call"), requestId, visitor: VISITOR, nowMs: redis.now() });
  if (!base.allowed) throw new Error("réservation de référence refusée");
  await circuit.settle({ reservation: base.reservation, actualNano: COST, countedTokens: 6_500, billedInputTokens: 6_406 });
}

function world(reserveFaults: Fault[], cancelFaults: Fault[] = [], timeoutMs = 30) {
  const redis = new FakeRedis(Date.UTC(2026, 8, 17, 10, 0, 0));
  const faults = new Map<string, Fault[]>();
  const circuit = createFinanceCircuit(faultyStore(redis, faults, timeoutMs), "test");
  const arm = () => {
    faults.set(RESERVE_SCRIPT, [...reserveFaults]);
    faults.set(CANCEL_SCRIPT, [...cancelFaults]);
  };
  return { redis, circuit, arm };
}

async function guarded(
  circuit: FinanceCircuit,
  redis: FakeRedis,
  options: { requestId?: string; callId?: string; defer?: boolean; callImpl?: () => Promise<ModelAttempt<string>> } = {}
) {
  const requestId = options.requestId ?? (await admitOk(circuit, redis, VISITOR));
  const callId = options.callId ?? id("call");
  const events: FinanceEvent[] = [];
  const tasks: (() => Promise<void>)[] = [];
  const callModel = vi.fn(options.callImpl ?? (async (): Promise<ModelAttempt<string>> => ({ kind: "success", value: "ok", usage })));
  const cancel = vi.spyOn(circuit, "cancel");
  const result = await runGuardedModelCall({
    circuit,
    visitor: VISITOR,
    requestId,
    callId,
    deadlineAt: redis.now() + 200_000,
    now: () => redis.now(),
    signal: new AbortController().signal,
    countTokens: async () => 6_500,
    callModel,
    sleep: async () => {},
    onEvent: (event) => events.push(event),
    defer: options.defer === false ? undefined : (task) => tasks.push(task),
  });
  return { result, events, tasks, callModel, cancel, callId, requestId };
}
const types = (events: FinanceEvent[]) => events.map((e) => e.type);

describe("R1 — RESERVE rejoué par la relance du SDK", () => {
  it("A — appliqué + réponse perdue + relance → replay (2 tentatives) → CANCEL, remboursé une fois, état cancelled", async () => {
    const w = world(["applied_then_retry"]);
    await reference(w.circuit, w.redis);
    w.arm();
    const { result, events, callModel, cancel, callId } = await guarded(w.circuit, w.redis);
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable", modelCalled: false });
    expect(types(events)).toEqual(["reserve_failed", "cancelled"]);
    expect(events[0]).toMatchObject({ diag: { storeKind: "replayed", errorClass: "ReserveReplay", httpAttempts: 2, timeoutMs: 1_500 } });
    expect(events[1]).toMatchObject({ outcome: "refunded", refundedNano: RESERVATION_NANO, attempt: 1 });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(w.redis.hget(keys.call(callId), "status")).toBe("cancelled");
    expect(counters(w.redis)).toEqual(REFERENCE);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("B — non appliqué + relance réussie → réservation normale, aucun CANCEL, appel après « reserved » seulement", async () => {
    const w = world(["lost_then_retry"]);
    w.arm();
    const { result, events, callModel, cancel } = await guarded(w.circuit, w.redis);
    expect(result).toMatchObject({ status: "ok", settleFailed: false });
    expect(types(events)).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(counters(w.redis)).toEqual(REFERENCE);
  });

  it("C — duplicate_call externe (1 tentative) → refus, reserve_duplicate, AUCUN CANCEL, réservation préexistante intacte", async () => {
    const w = world([]);
    const requestId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    const foreign = await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    expect(foreign.allowed).toBe(true);
    const { result, events, callModel, cancel, tasks } = await guarded(w.circuit, w.redis, { requestId, callId });
    expect(result).toEqual({ status: "refused", reason: "duplicate_call", modelCalled: false, countedTokens: 6_500 });
    expect(types(events)).toEqual(["reserve_duplicate"]);
    expect(cancel).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(0);
    expect(callModel).not.toHaveBeenCalled();
    expect(w.redis.hget(keys.call(callId), "status")).toBe("reserved");
    expect(counters(w.redis)).toEqual({ day: RESERVATION_NANO, hour: RESERVATION_NANO, visitor: RESERVATION_NANO });
  });

  it("D — R1 + CANCEL : remboursement unique, aucun double débit, aucun nouveau budget", async () => {
    const w = world(["applied_then_retry"]);
    await reference(w.circuit, w.redis);
    const reserve = vi.spyOn(w.circuit, "reserve");
    w.arm();
    const { events } = await guarded(w.circuit, w.redis);
    const refunds = events.filter((e) => e.type === "cancelled").map((e) => (e.type === "cancelled" ? e.refundedNano : 0));
    expect(refunds).toEqual([RESERVATION_NANO]);
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(counters(w.redis)).toEqual(REFERENCE);
  });

  it("E — R1 + CANCEL rejoué : 1er rembourse, 2e replay (refundedNano 0), compteurs = référence", async () => {
    const w = world(["applied_then_retry"]);
    await reference(w.circuit, w.redis);
    w.arm();
    const { cancel } = await guarded(w.circuit, w.redis);
    const pending = cancel.mock.calls[0][0] as Reservation;
    expect(await w.circuit.cancel(pending)).toEqual({ ok: true, outcome: "replay", refundedNano: 0 });
    expect(counters(w.redis)).toEqual(REFERENCE);
  });

  it("F — aucun modèle sans RESERVE confirmé : replay 1 et 2 tentatives, pannes C.3.4", async () => {
    for (const fault of ["applied_then_retry", "timeout_before", "timeout_after", "upstash", "network", "bad_reply"] as Fault[]) {
      const w = world([fault]);
      w.arm();
      const { callModel, result } = await guarded(w.circuit, w.redis);
      expect(callModel, fault).not.toHaveBeenCalled();
      expect(result, fault).toMatchObject({ status: "refused", modelCalled: false });
    }
    const w = world([]);
    const requestId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    const { callModel, result } = await guarded(w.circuit, w.redis, { requestId, callId });
    expect(callModel).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "refused", reason: "duplicate_call" });
  });

  it("G — R1 + CANCEL lent (> 250 ms) → cancel_pending, refus immédiat, after() termine le CANCEL", async () => {
    const w = world(["applied_then_retry"], ["slow_after"], 1_000);
    await reference(w.circuit, w.redis);
    w.arm();
    const started = Date.now();
    const { result, events, tasks, callModel } = await guarded(w.circuit, w.redis);
    expect(Date.now() - started).toBeLessThan(SLOW_FAULT_MS);
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable" });
    expect(types(events)).toEqual(["reserve_failed", "cancel_pending"]);
    expect(counters(w.redis).day).toBe(COST + RESERVATION_NANO);
    await tasks[0]();
    expect(events.at(-1)).toMatchObject({ type: "cancelled", outcome: "refunded", refundedNano: RESERVATION_NANO, deferred: true });
    expect(counters(w.redis)).toEqual(REFERENCE);
    expect(callModel).not.toHaveBeenCalled();
  });
});

describe("R1 — vrai client Upstash face à un serveur local (FakeRedis, aucun service externe)", () => {
  let server: Server | undefined;
  afterEach(async () => {
    server?.closeAllConnections();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  /** Serveur REST compatible Upstash : exécute les vrais scripts sur FakeRedis. */
  async function upstashLike(redis: FakeRedis, dropFirstReserveResponse: boolean) {
    const seen: string[] = [];
    let dropped = !dropFirstReserveResponse;
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const [, script, numKeys, ...rest] = JSON.parse(raw) as string[];
        const n = Number(numKeys);
        const result = redis.eval(script, rest.slice(0, n), rest.slice(n));
        const op = script === RESERVE_SCRIPT ? "RESERVE" : script === CANCEL_SCRIPT ? "CANCEL" : "AUTRE";
        seen.push(op);
        // Tentative 1 du RESERVE : exécutée, puis connexion coupée (réponse perdue).
        if (op === "RESERVE" && !dropped) {
          dropped = true;
          req.socket.destroy();
          return;
        }
        const b64 = req.headers["upstash-encoding"] === "base64";
        const encode = (v: unknown): unknown =>
          Array.isArray(v) ? v.map(encode) : typeof v === "string" && b64 ? Buffer.from(v).toString("base64") : v;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ result: encode(result) }));
      });
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
    return { seen, circuit: createFinanceCircuit(createUpstashStore({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: "jeton-de-test" }), "test") };
  }

  it("A' — réponse perdue → relance du SDK → replay ; httpAttempts 2 remonte au circuit → CANCEL, aucun modèle", async () => {
    const redis = new FakeRedis(Date.now());
    const { seen, circuit } = await upstashLike(redis, true);
    const { result, events, callModel, callId } = await guarded(circuit, redis);
    expect(seen.filter((op) => op === "RESERVE")).toHaveLength(2);
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable", modelCalled: false });
    expect(events[0]).toMatchObject({ type: "reserve_failed", diag: { storeKind: "replayed", errorClass: "ReserveReplay", httpAttempts: 2 } });
    expect(events.at(-1)).toMatchObject({ type: "cancelled", outcome: "refunded", refundedNano: RESERVATION_NANO });
    expect(redis.hget(keys.call(callId), "status")).toBe("cancelled");
    expect(counters(redis)).toEqual({ day: 0, hour: 0, visitor: 0 });
    expect(callModel).not.toHaveBeenCalled();
  });

  it("C' — état préexistant, 1 seule tentative HTTP → duplicate_call, aucun CANCEL", async () => {
    const redis = new FakeRedis(Date.now());
    const { seen, circuit } = await upstashLike(redis, false);
    const requestId = await admitOk(circuit, redis, VISITOR);
    const callId = id("call");
    expect((await circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: redis.now() })).allowed).toBe(true);
    const { result, events, callModel } = await guarded(circuit, redis, { requestId, callId });
    expect(result).toMatchObject({ status: "refused", reason: "duplicate_call" });
    expect(types(events)).toEqual(["reserve_duplicate"]);
    expect(seen).not.toContain("CANCEL");
    expect(redis.hget(keys.call(callId), "status")).toBe("reserved");
    expect(callModel).not.toHaveBeenCalled();
  });
});
