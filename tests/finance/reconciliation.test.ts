import { describe, expect, it, vi } from "vitest";
import { createFinanceCircuit, type FinanceCircuit } from "@/lib/ai/finance/circuit";
import { runGuardedModelCall, type FinanceEvent, type ModelAttempt } from "@/lib/ai/finance/guarded-call";
import { financeKeys } from "@/lib/ai/finance/keys";
import { RESERVATION_NANO } from "@/lib/ai/finance/limits";
import { CANCEL_SCRIPT, RESERVE_SCRIPT, SETTLE_SCRIPT } from "@/lib/ai/finance/scripts";
import { FakeRedis } from "./fake-redis";
import { faultyStore, SLOW_FAULT_MS, type Fault } from "./fault-store";
import { admitOk, id, vid } from "./helpers";

/**
 * Réconciliation SETTLE / CANCEL (C.3.3) : relance unique, rejeu idempotent,
 * reprise différée bornée, annulation d'une réservation incertaine.
 * Invariants vérifiés à chaque cas : aucun double débit, aucun compteur
 * négatif, aucun appel modèle sans réservation confirmée.
 */

const keys = financeKeys("test");
const VISITOR = vid("reconciliation");
const usage = { input_tokens: 2_000, output_tokens: 300, cache_read_input_tokens: 4_406, cache_creation_input_tokens: 0 };
const COST = 2_000 * 5_500 + 4_406 * 550 + 300 * 27_500;

function world(plan: Record<string, Fault[]> = {}, timeoutMs = 30) {
  const redis = new FakeRedis(Date.UTC(2026, 8, 17, 10, 0, 0));
  const faults = new Map<string, Fault[]>(Object.entries(plan));
  const circuit = createFinanceCircuit(faultyStore(redis, faults, timeoutMs), "test");
  const counters = () => ({
    day: redis.peekNumber(keys.spendDay(redis.now())),
    hour: redis.peekNumber(keys.spendHour(redis.now())),
    visitor: redis.peekNumber(keys.spendVisitorDay(VISITOR, redis.now())),
  });
  return { redis, circuit, counters, faults };
}

async function guarded(
  w: { redis: FakeRedis; circuit: FinanceCircuit },
  options: { callImpl?: () => Promise<ModelAttempt<string>>; defer?: boolean } = {}
) {
  const requestId = await admitOk(w.circuit, w.redis, VISITOR);
  const callId = id("call");
  const events: FinanceEvent[] = [];
  const tasks: (() => Promise<void>)[] = [];
  const callModel = vi.fn(options.callImpl ?? (async (): Promise<ModelAttempt<string>> => ({ kind: "success", value: "ok", usage })));
  const deadlineAt = w.redis.now() + 200_000;
  const result = await runGuardedModelCall({
    circuit: w.circuit,
    visitor: VISITOR,
    requestId,
    callId,
    deadlineAt,
    now: () => w.redis.now(),
    signal: new AbortController().signal,
    countTokens: async () => 6_500,
    callModel,
    sleep: async () => {},
    onEvent: (event) => events.push(event),
    defer: options.defer === false ? undefined : (task) => tasks.push(task),
  });
  return { result, events, tasks, callModel, callId, requestId, deadlineAt };
}

const types = (events: FinanceEvent[]) => events.map((e) => e.type);

describe("SETTLE — relance et rejeu", () => {
  it("#1 succès immédiat : un règlement, aucun événement de réconciliation", async () => {
    const w = world();
    const { result, events, tasks } = await guarded(w);
    expect(result).toMatchObject({ status: "ok", settleFailed: false });
    expect(types(events)).toEqual([]);
    expect(tasks).toHaveLength(0);
    expect(w.counters()).toEqual({ day: COST, hour: COST, visitor: COST });
  });

  it("#2 #4 timeout AVANT exécution → relance → settled", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_before"] });
    const { result, events, tasks, callId } = await guarded(w);
    expect(result).toMatchObject({ status: "ok", settleFailed: false });
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settled"]);
    expect(events[0]).toMatchObject({ attempt: 1, reason: "store_unavailable", diag: { storeKind: "timeout", errorClass: "FinanceStoreError", timeoutMs: 30 } });
    expect(events[2]).toMatchObject({ attempt: 2, outcome: "settled" });
    expect(tasks).toHaveLength(0);
    expect(w.redis.hget(keys.call(callId), "status")).toBe("settled");
    expect(w.counters()).toEqual({ day: COST, hour: COST, visitor: COST });
  });

  it("#3 #5 timeout APRÈS exécution → relance → replay, aucun double débit", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_after"] });
    const { result, events } = await guarded(w);
    expect(result).toMatchObject({ status: "ok", settleFailed: false });
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settled"]);
    expect(events[2]).toMatchObject({ attempt: 2, outcome: "replay" });
    expect(w.counters()).toEqual({ day: COST, hour: COST, visitor: COST });
  });

  it("#6 erreur HTTP Upstash → relance ; le message brut (commande, clés) n'est jamais repris", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["upstash"] });
    const { result, events, callId } = await guarded(w);
    expect(result).toMatchObject({ status: "ok", settleFailed: false });
    expect(events[0]).toMatchObject({ reason: "store_unavailable", diag: { storeKind: "unavailable", errorClass: "UpstashError" } });
    // callId est l'identifiant de corrélation attendu ; tout le reste est vérifié.
    const serialized = JSON.stringify(events.map((e) => ({ ...e, callId: undefined })));
    expect(serialized).not.toContain("{ch:ai:");
    expect(serialized).not.toContain(callId);
    expect(serialized).not.toContain(VISITOR);
    expect(serialized).not.toContain("command was");
  });

  it("erreur réseau : code whitelisté (ECONNRESET), aucun message", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["network"] });
    const { events } = await guarded(w);
    expect(events[0]).toMatchObject({ diag: { errorClass: "TypeError", errorCode: "ECONNRESET" } });
    expect(JSON.stringify(events)).not.toContain("socket hang up");
  });

  it("réponse inexploitable après exécution → relance → replay", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["bad_reply"] });
    const { events } = await guarded(w);
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settled"]);
    expect(events[0]).toMatchObject({ diag: { storeKind: "bad_reply", errorClass: "BadReply" } });
    expect(events[2]).toMatchObject({ outcome: "replay" });
    expect(w.counters().day).toBe(COST);
  });

  it("#7 réservation inconnue : aucune relance, aucune reprise, rien de rendu", async () => {
    // L'état de l'appel disparaît entre RESERVE et SETTLE.
    const w2 = world();
    const reqId = await admitOk(w2.circuit, w2.redis, VISITOR);
    const callId = id("call");
    const events2: FinanceEvent[] = [];
    const tasks2: (() => Promise<void>)[] = [];
    const r = await runGuardedModelCall({
      circuit: w2.circuit, visitor: VISITOR, requestId: reqId, callId, deadlineAt: w2.redis.now() + 200_000,
      now: () => w2.redis.now(), signal: new AbortController().signal, countTokens: async () => 6_500,
      callModel: async () => {
        w2.redis.del(keys.call(callId));
        return { kind: "success", value: "ok", usage };
      },
      sleep: async () => {}, onEvent: (e) => events2.push(e), defer: (t) => tasks2.push(t),
    });
    expect(r).toMatchObject({ status: "ok", settleFailed: true });
    expect(types(events2)).toEqual(["settle_failed"]);
    expect(events2[0]).toMatchObject({ attempt: 1, reason: "unknown_reservation" });
    expect(tasks2).toHaveLength(0);
    expect(w2.counters().day).toBe(RESERVATION_NANO);
  });

  it("#8 clés différentes : aucune relance, aucune modification", async () => {
    const w = world();
    const reqId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    const events: FinanceEvent[] = [];
    const r = await runGuardedModelCall({
      circuit: w.circuit, visitor: VISITOR, requestId: reqId, callId, deadlineAt: w.redis.now() + 200_000,
      now: () => w.redis.now(), signal: new AbortController().signal, countTokens: async () => 6_500,
      callModel: async () => {
        w.redis.eval("redis.call('HSET', KEYS[1], 'day', 'autre-jour') return 1", [keys.call(callId)], []);
        return { kind: "success", value: "ok", usage };
      },
      sleep: async () => {}, onEvent: (e) => events.push(e), defer: () => {},
    });
    expect(r).toMatchObject({ settleFailed: true });
    expect(events).toEqual([expect.objectContaining({ type: "settle_failed", attempt: 1, reason: "key_mismatch" })]);
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("rejeu après un premier règlement qui a posé le kill : kill observé (lecture seule)", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_after"] });
    const forbidden = { ...usage, service_tier: "priority" };
    const { events } = await guarded(w, { callImpl: async () => ({ kind: "success", value: "ok", usage: forbidden }) });
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settled", "kill_observed"]);
    expect(events[3]).toMatchObject({ reason: "usage_interdit" });
    expect(w.redis.peek(keys.kill)).toBe("usage_interdit");
    expect(w.counters().day).toBe(COST);
  });
});

describe("SETTLE — reprise différée (after)", () => {
  it("#9 double échec → une reprise programmée, aucune boucle ; reprise → settled", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_before", "timeout_before", "timeout_before"] });
    const { result, events, tasks, callModel } = await guarded(w);
    expect(result).toMatchObject({ status: "ok", settleFailed: true });
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settle_failed", "settle_deferred"]);
    expect(tasks).toHaveLength(1);
    expect(w.counters().day).toBe(RESERVATION_NANO);
    const reserves = vi.spyOn(w.circuit, "reserve");
    await tasks[0]();
    expect(types(events).slice(4)).toEqual(["settle_failed", "settled"]);
    expect(events.at(-1)).toMatchObject({ attempt: 4, outcome: "settled", deferred: true });
    expect(w.counters()).toEqual({ day: COST, hour: COST, visitor: COST });
    // La reprise ne réserve rien et n'appelle jamais le modèle.
    expect(reserves).not.toHaveBeenCalled();
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("reprise épuisée → settle_abandoned avec le coût réel à reporter ; réservation conservée", async () => {
    const w = world({ [SETTLE_SCRIPT]: Array(4).fill("timeout_before") });
    const { events, tasks } = await guarded(w);
    await tasks[0]();
    expect(events.at(-1)).toMatchObject({ type: "settle_abandoned", reason: "exhausted", costNano: COST, amountNano: RESERVATION_NANO });
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("reprise hors fenêtre (durée maximale de la fonction) → abandon sans tentative", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_before", "timeout_before"] });
    const { events, tasks } = await guarded(w);
    w.redis.advance(400_000);
    await tasks[0]();
    expect(events.at(-1)).toMatchObject({ type: "settle_abandoned", reason: "window" });
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("sans `defer` → settle_abandoned no_defer, état prudent", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_before", "timeout_before"] });
    const { result, events } = await guarded(w, { defer: false });
    expect(result).toMatchObject({ settleFailed: true });
    expect(events.at(-1)).toMatchObject({ type: "settle_abandoned", reason: "no_defer", costNano: COST });
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("restitution (erreur HTTP 500 persistante) elle aussi relancée", async () => {
    const w = world({ [SETTLE_SCRIPT]: ["timeout_before"] });
    const { result, events } = await guarded(w, {
      callImpl: async () => ({ kind: "http_error", status: 400 }),
    });
    expect(result).toMatchObject({ status: "failed", refunded: true });
    expect(types(events)).toEqual(["settle_failed", "settle_retry", "settled"]);
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
  });
});

describe("RESERVE incertain → CANCEL", () => {
  it("#19 RESERVE appliqué malgré le timeout → CANCEL restitue, aucun appel modèle", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_after"] });
    const { result, events, tasks, callModel, callId } = await guarded(w);
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable", modelCalled: false });
    expect(callModel).not.toHaveBeenCalled();
    expect(types(events)).toEqual(["reserve_failed", "cancelled"]);
    expect(events[1]).toMatchObject({ outcome: "refunded", refundedNano: RESERVATION_NANO });
    expect(w.redis.hget(keys.call(callId), "status")).toBe("cancelled");
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
    expect(tasks).toHaveLength(0);
  });

  it("#19b RESERVE jamais arrivé → pierre tombale ; un RESERVE tardif ne compte rien", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_before"] });
    const { events, callModel, callId, requestId } = await guarded(w);
    expect(callModel).not.toHaveBeenCalled();
    expect(events[1]).toMatchObject({ type: "cancelled", outcome: "tombstoned", refundedNano: 0 });
    // La requête RESERVE perdue arrive enfin : elle trouve l'état « cancelled ».
    const late = await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    expect(late).toEqual({ allowed: false, reason: "duplicate_call" });
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
    // Un SETTLE sur un appel annulé ne modifie rien.
    const settled = await w.circuit.settle({
      reservation: { callId, requestId, visitor: VISITOR, amountNano: RESERVATION_NANO, keys: { day: keys.spendDay(w.redis.now()), hour: keys.spendHour(w.redis.now()), visitor: keys.spendVisitorDay(VISITOR, w.redis.now()), alert60: keys.alert60(w.redis.now()), alert80: keys.alert80(w.redis.now()) } },
      actualNano: 1_000,
      countedTokens: 0,
      billedInputTokens: 0,
    });
    expect(settled).toMatchObject({ ok: false, reason: "cancelled_call" });
    expect(w.counters().day).toBe(0);
  });

  it("CANCEL en échec rapide (< 250 ms) → cancel_pending ; la relance après la réponse rejoue sans double remboursement", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_after"], [CANCEL_SCRIPT]: ["timeout_after"] });
    const { events, tasks } = await guarded(w);
    expect(types(events)).toEqual(["reserve_failed", "cancel_failed", "cancel_pending"]);
    expect(events[1]).toMatchObject({ attempt: 1, deferred: false, reason: "store_unavailable" });
    expect(events[2]).toMatchObject({ waitMs: 250, deferred: true });
    // La 1re tentative a été exécutée malgré son timeout : déjà remboursé.
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
    expect(tasks).toHaveLength(1);
    await tasks[0]();
    expect(events.at(-1)).toMatchObject({ type: "cancelled", attempt: 2, outcome: "replay", refundedNano: 0, deferred: true });
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
  });

  it("CANCEL lent (> 250 ms) : refus rendu sans l'attendre ; la continuation termine la MÊME tentative", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["bad_reply"], [CANCEL_SCRIPT]: ["slow_after"] }, 1_000);
    const cancel = vi.spyOn(w.circuit, "cancel");
    const started = Date.now();
    const { result, events, tasks, callModel, callId } = await guarded(w);
    const refusalMs = Date.now() - started;
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable", modelCalled: false });
    expect(refusalMs).toBeLessThan(SLOW_FAULT_MS);
    expect(types(events)).toEqual(["reserve_failed", "cancel_pending"]);
    expect(w.counters().day).toBe(RESERVATION_NANO);
    const reserves = vi.spyOn(w.circuit, "reserve");
    const settles = vi.spyOn(w.circuit, "settle");
    await tasks[0]();
    expect(events.at(-1)).toMatchObject({ type: "cancelled", callId, attempt: 1, outcome: "refunded", refundedNano: RESERVATION_NANO, deferred: true });
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
    // Une seule tentative CANCEL, même réservation ; aucun RESERVE, SETTLE ni appel modèle.
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(reserves).not.toHaveBeenCalled();
    expect(settles).not.toHaveBeenCalled();
    expect(callModel).not.toHaveBeenCalled();
  });

  it("CANCEL impossible → relances bornées après la réponse → reserve_uncertain, montant conservé", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_after"], [CANCEL_SCRIPT]: ["timeout_before", "timeout_before", "timeout_before"] });
    const cancel = vi.spyOn(w.circuit, "cancel");
    const { result, events, tasks, callModel } = await guarded(w);
    expect(result).toMatchObject({ status: "refused", reason: "store_unavailable" });
    expect(callModel).not.toHaveBeenCalled();
    expect(types(events)).toEqual(["reserve_failed", "cancel_failed", "cancel_pending"]);
    await tasks[0]();
    expect(types(events).slice(3)).toEqual(["cancel_failed", "cancel_failed", "reserve_uncertain"]);
    expect(events.at(-1)).toMatchObject({ attempt: 3, amountNano: RESERVATION_NANO, deferred: true });
    // 3 tentatives au total, jamais davantage ; mêmes identifiants et montant.
    expect(cancel).toHaveBeenCalledTimes(3);
    for (const [reservation] of cancel.mock.calls) expect(reservation).toEqual(cancel.mock.calls[0][0]);
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("sans `defer` : CANCEL poursuivi au mieux (promesse détachée), refus immédiat", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["bad_reply"], [CANCEL_SCRIPT]: ["slow_after"] }, 1_000);
    const { events } = await guarded(w, { defer: false });
    expect(events.at(-1)).toMatchObject({ type: "cancel_pending", deferred: false });
    expect(w.counters().day).toBe(RESERVATION_NANO);
    await new Promise((resolve) => setTimeout(resolve, SLOW_FAULT_MS + 200));
    expect(events.at(-1)).toMatchObject({ type: "cancelled", outcome: "refunded", deferred: true });
    expect(w.counters().day).toBe(0);
  });

  it("identité incohérente : aucun remboursement aveugle, aucune relance", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_after"], [CANCEL_SCRIPT]: ["mismatch_exec"] });
    const { events, tasks } = await guarded(w);
    expect(types(events)).toEqual(["reserve_failed", "cancel_failed", "reserve_uncertain"]);
    expect(events[1]).toMatchObject({ reason: "key_mismatch" });
    expect(tasks).toHaveLength(0);
    expect(w.counters().day).toBe(RESERVATION_NANO);
  });

  it("CANCEL rejoué : aucun effet supplémentaire", async () => {
    const w = world({ [RESERVE_SCRIPT]: ["timeout_after"] });
    const requestId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    const reserved = await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    expect(reserved).toMatchObject({ allowed: false, reason: "store_unavailable" });
    const pending = !reserved.allowed && reserved.reason === "store_unavailable" ? reserved.pending! : (null as never);
    expect(await w.circuit.cancel(pending)).toEqual({ ok: true, outcome: "refunded", refundedNano: RESERVATION_NANO });
    expect(await w.circuit.cancel(pending)).toEqual({ ok: true, outcome: "replay", refundedNano: 0 });
    expect(w.counters()).toEqual({ day: 0, hour: 0, visitor: 0 });
  });

  it("CANCEL n'annule jamais un appel réglé", async () => {
    const w = world();
    const requestId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    const reserved = await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    if (!reserved.allowed) throw new Error("réservation refusée");
    await w.circuit.settle({ reservation: reserved.reservation, actualNano: COST, countedTokens: 6_500, billedInputTokens: 6_406 });
    expect(await w.circuit.cancel(reserved.reservation)).toEqual({ ok: true, outcome: "replay", refundedNano: 0 });
    expect(w.counters().day).toBe(COST);
  });
});

describe("invariants financiers", () => {
  it("#22–#26 séquences mêlées : aucun double débit, aucun compteur négatif, jour = heure = visiteur", async () => {
    const plans: Record<string, Fault[]>[] = [
      { [SETTLE_SCRIPT]: ["timeout_after", "timeout_after"] },
      { [SETTLE_SCRIPT]: ["timeout_before", "timeout_after", "timeout_before"] },
      { [RESERVE_SCRIPT]: ["timeout_after"], [CANCEL_SCRIPT]: ["timeout_after", "timeout_after"] },
      { [SETTLE_SCRIPT]: ["upstash", "network"] },
      { [RESERVE_SCRIPT]: ["bad_reply"] },
    ];
    for (const plan of plans) {
      const w = world(plan);
      const { tasks, result } = await guarded(w);
      for (const task of tasks) await task();
      const c = w.counters();
      expect(c.day).toBeGreaterThanOrEqual(0);
      expect(c.day).toBe(c.hour);
      expect(c.day).toBe(c.visitor);
      // Le coût réel n'est jamais compté deux fois ; seule la réservation peut rester (prudence).
      expect([0, COST, RESERVATION_NANO]).toContain(c.day);
      if (result.status === "ok" && !result.settleFailed) expect(c.day).toBe(COST);
    }
  });

  it("#28 aucun appel modèle sans RESERVE confirmé, quelle que soit la panne de RESERVE", async () => {
    for (const fault of ["timeout_before", "timeout_after", "upstash", "network", "bad_reply"] as Fault[]) {
      const w = world({ [RESERVE_SCRIPT]: [fault] });
      const { callModel, result } = await guarded(w);
      expect(callModel).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "refused", modelCalled: false });
      expect(w.counters().day).toBe(0);
    }
  });
});

describe("RESERVE tardif : courses R (RESERVE) / L (RELEASE) / C (CANCEL)", () => {
  /**
   * Une dépense de référence (autre appel réglé à COST) est posée d'abord :
   * les compteurs ne descendant jamais sous zéro, un remboursement en trop
   * serait sinon masqué. Attendu dans tous les cas : compteurs = COST.
   */
  async function race(reserveFault: Fault) {
    const w = world();
    const baseRequest = await admitOk(w.circuit, w.redis, VISITOR);
    const base = await w.circuit.reserve({ callId: id("call"), requestId: baseRequest, visitor: VISITOR, nowMs: w.redis.now() });
    if (!base.allowed) throw new Error("réservation de référence refusée");
    await w.circuit.settle({ reservation: base.reservation, actualNano: COST, countedTokens: 6_500, billedInputTokens: 6_406 });
    const requestId = await admitOk(w.circuit, w.redis, VISITOR);
    const callId = id("call");
    w.faults.set(RESERVE_SCRIPT, [reserveFault]);
    const first = await w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    if (first.allowed || first.reason !== "store_unavailable" || !first.pending) throw new Error("RESERVE incertain attendu");
    // Le même RESERVE, arrivé en retard (mêmes identifiants, même instant).
    const lateReserve = () => w.circuit.reserve({ callId, requestId, visitor: VISITOR, nowMs: w.redis.now() });
    return { w, requestId, callId, pending: first.pending, lateReserve, status: () => w.redis.hget(keys.call(callId), "status") };
  }
  const EXPECTED = { day: COST, hour: COST, visitor: COST };

  it("Cas A — RESERVE → CANCEL : réservation créée, remboursée, état cancelled", async () => {
    const r = await race("timeout_after");
    expect(r.w.counters().day).toBe(COST + RESERVATION_NANO);
    expect(await r.w.circuit.cancel(r.pending)).toEqual({ ok: true, outcome: "refunded", refundedNano: RESERVATION_NANO });
    expect(r.status()).toBe("cancelled");
    expect(r.w.counters()).toEqual(EXPECTED);
  });

  it("Cas B — CANCEL → RESERVE : pierre tombale, RESERVE tardif rejoué, aucun débit net", async () => {
    const r = await race("timeout_before");
    expect(await r.w.circuit.cancel(r.pending)).toEqual({ ok: true, outcome: "tombstoned", refundedNano: 0 });
    expect(await r.lateReserve()).toEqual({ allowed: false, reason: "duplicate_call" });
    expect(r.status()).toBe("cancelled");
    expect(r.w.counters()).toEqual(EXPECTED);
  });

  it("Cas C — RELEASE → RESERVE : RESERVE tardif refusé, aucun nouveau débit", async () => {
    const r = await race("timeout_before");
    expect(await r.w.circuit.release({ requestId: r.requestId, visitor: VISITOR })).toBe(true);
    expect(await r.lateReserve()).toEqual({ allowed: false, reason: "slot_expired" });
    expect(r.status()).toBeNull();
    expect(r.w.counters()).toEqual(EXPECTED);
    // Le CANCEL qui suit ne fait que poser la pierre tombale.
    expect(await r.w.circuit.cancel(r.pending)).toEqual({ ok: true, outcome: "tombstoned", refundedNano: 0 });
    expect(r.w.counters()).toEqual(EXPECTED);
  });

  it("Cas D — RESERVE → CANCEL → CANCEL : un seul remboursement, second CANCEL = replay", async () => {
    const r = await race("timeout_after");
    expect(await r.w.circuit.cancel(r.pending)).toMatchObject({ outcome: "refunded" });
    expect(await r.w.circuit.cancel(r.pending)).toEqual({ ok: true, outcome: "replay", refundedNano: 0 });
    expect(r.w.counters()).toEqual(EXPECTED);
  });

  it("Cas E — CANCEL → CANCEL → RESERVE : aucun double remboursement, RESERVE tardif neutralisé", async () => {
    const r = await race("timeout_before");
    expect(await r.w.circuit.cancel(r.pending)).toMatchObject({ outcome: "tombstoned" });
    expect(await r.w.circuit.cancel(r.pending)).toEqual({ ok: true, outcome: "replay", refundedNano: 0 });
    expect(await r.lateReserve()).toEqual({ allowed: false, reason: "duplicate_call" });
    expect(r.w.counters()).toEqual(EXPECTED);
  });

  it("RESERVE tardif après expiration de la place (270 s) : refusé", async () => {
    const r = await race("timeout_before");
    r.w.redis.advance(271_000);
    const late = await r.w.circuit.reserve({ callId: r.callId, requestId: r.requestId, visitor: VISITOR, nowMs: r.w.redis.now() });
    expect(late).toEqual({ allowed: false, reason: "slot_expired" });
    expect(r.w.counters().day).toBe(COST);
  });
});
