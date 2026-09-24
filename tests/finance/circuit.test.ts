import { beforeEach, describe, expect, it } from "vitest";
import type { FinanceCircuit } from "@/lib/ai/finance/circuit";
import { financeKeys } from "@/lib/ai/finance/keys";
import {
  BUDGET_GLOBAL_DAY_NANO,
  BUDGET_GLOBAL_HOUR_NANO,
  BUDGET_VISITOR_DAY_NANO,
  CONCURRENCY_SLOT_TTL_MS,
  KILL_429_WINDOW_SECONDS,
  PAUSE_429_DURATION_SECONDS,
  RESERVATION_NANO,
  TTL_CALL_SECONDS,
} from "@/lib/ai/finance/limits";
import { FakeRedis } from "./fake-redis";
import { admitOk, id, newCircuit, reserveOk, vid } from "./helpers";

const HOUR = 3_600_000;
const keys = financeKeys("test");

let redis: FakeRedis;
let circuit: FinanceCircuit;

beforeEach(() => {
  // Minuit UTC : toutes les heures de la journée sont disponibles.
  redis = new FakeRedis(Date.UTC(2026, 8, 17, 0, 0, 0));
  circuit = newCircuit(redis);
});

describe("admission", () => {
  it("admet puis limite à 5 requêtes par minute", async () => {
    const visitor = vid(1);
    for (let i = 0; i < 5; i += 1) {
      const requestId = await admitOk(circuit, redis, visitor);
      await circuit.release({ requestId, visitor });
    }
    expect(await circuit.admit({ requestId: id("req"), visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "rate_minute",
    });
    redis.advance(60_000);
    expect((await circuit.admit({ requestId: id("req"), visitor, nowMs: redis.now() })).allowed).toBe(true);
  });

  it("limite à 30 requêtes par heure", async () => {
    const visitor = vid(2);
    for (let i = 0; i < 30; i += 1) {
      const requestId = await admitOk(circuit, redis, visitor);
      await circuit.release({ requestId, visitor });
      redis.advance(60_000);
    }
    expect(await circuit.admit({ requestId: id("req"), visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "rate_hour",
    });
  });

  it("limite à 2 requêtes simultanées par visiteur", async () => {
    const visitor = vid(3);
    await admitOk(circuit, redis, visitor);
    await admitOk(circuit, redis, visitor);
    expect(await circuit.admit({ requestId: id("req"), visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "concurrency_visitor",
    });
  });

  it("8 requêtes simultanées globales, la 9e est refusée", async () => {
    for (let i = 0; i < 8; i += 1) await admitOk(circuit, redis, vid(100 + i));
    expect(await circuit.admit({ requestId: id("req"), visitor: vid(200), nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "concurrency_global",
    });
  });

  it("refuse tout quand le kill est actif", async () => {
    redis.set(keys.kill, "test");
    expect(await circuit.admit({ requestId: id("req"), visitor: vid(4), nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "killed",
    });
  });

  it("refuse tout pendant une pause", async () => {
    redis.set(keys.pause, "test", 60);
    expect(await circuit.admit({ requestId: id("req"), visitor: vid(4), nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "paused",
    });
  });

  it("n'accepte ni identifiant de requête arbitraire, ni clé visiteur non HMAC", async () => {
    expect(await circuit.admit({ requestId: "x", visitor: vid(5), nowMs: redis.now() })).toMatchObject({
      reason: "invalid_identifier",
    });
    expect(await circuit.admit({ requestId: id("req"), visitor: "v4:1.2.3.4", nowMs: redis.now() })).toMatchObject({
      reason: "invalid_identifier",
    });
  });

  it("aucune IP brute dans les clés ou valeurs Redis", async () => {
    const visitor = vid(6);
    await reserveOk(circuit, redis, visitor);
    for (const key of redis.keys()) expect(key).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});

describe("réservation et budgets", () => {
  it("réservation unique : 0,2475 $ sur les trois compteurs, périodes mémorisées", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    expect(redis.peekNumber(r.keys.day)).toBe(RESERVATION_NANO);
    expect(redis.peekNumber(r.keys.hour)).toBe(RESERVATION_NANO);
    expect(redis.peekNumber(r.keys.visitor)).toBe(RESERVATION_NANO);
    expect(redis.hget(keys.call(r.callId), "day")).toBe(r.keys.day);
    expect(redis.hget(keys.call(r.callId), "request")).toBe(r.requestId);
  });

  it("budget visiteur : 1,90 $ déjà engagés → refus ; autre visiteur accepté", async () => {
    const visitor = vid(7);
    redis.set(keys.spendVisitorDay(visitor, redis.now()), "1900000000", 3600);
    const requestId = await admitOk(circuit, redis, visitor);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "budget_visitor",
    });
    await reserveOk(circuit, redis, vid(8));
  });

  it("budget visiteur : 8 appels à 2 $, le 9e refusé", async () => {
    const visitor = vid(7);
    const requestId = await admitOk(circuit, redis, visitor);
    for (let i = 0; i < 8; i += 1) await reserveOk(circuit, redis, visitor, requestId);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "budget_visitor",
    });
    expect(redis.peekNumber(keys.spendVisitorDay(visitor, redis.now()))).toBeLessThanOrEqual(BUDGET_VISITOR_DAY_NANO);
  });

  it("budget horaire : 3,50 $ déjà engagés → refus ; 14 appels puis refus", async () => {
    redis.set(keys.spendHour(redis.now()), "3500000000", 3600);
    const visitor = vid(9);
    const requestId = await admitOk(circuit, redis, visitor);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "budget_hour",
    });
    redis.del(keys.spendHour(redis.now()));
    const requests = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((v) => admitOk(circuit, redis, vid(20 + v))));
    for (let i = 0; i < 14; i += 1) {
      await reserveOk(circuit, redis, vid(20 + (i % 7)), requests[i % 7]);
    }
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "budget_hour",
    });
    expect(redis.peekNumber(keys.spendHour(redis.now()))).toBeLessThanOrEqual(BUDGET_GLOBAL_HOUR_NANO);
  });

  it("budget journalier : 8,90 $ déjà engagés → refus ; 36 appels puis refus", async () => {
    redis.set(keys.spendDay(redis.now()), "8900000000", 3600);
    const visitor = vid(10);
    const requestId = await admitOk(circuit, redis, visitor);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "budget_day",
    });
    redis.del(keys.spendDay(redis.now()));

    let granted = 0;
    for (let hour = 0; hour < 4; hour += 1) {
      const visitors = [0, 1].map((v) => vid(`jour-${hour}-${v}`));
      const reqs = await Promise.all(visitors.map((v) => admitOk(circuit, redis, v)));
      for (let i = 0; i < 16; i += 1) {
        const d = await circuit.reserve({ callId: id("call"), requestId: reqs[i % 2], visitor: visitors[i % 2], nowMs: redis.now() });
        if (d.allowed) granted += 1;
      }
      await Promise.all(visitors.map((v, i) => circuit.release({ requestId: reqs[i], visitor: v })));
      redis.advance(HOUR);
    }
    expect(granted).toBe(36);
    expect(redis.peekNumber(keys.spendDay(Date.UTC(2026, 8, 17)))).toBe(36 * RESERVATION_NANO);
  });

  it("refuse la réservation quand le kill ou la pause est actif", async () => {
    const visitor = vid(11);
    const requestId = await admitOk(circuit, redis, visitor);
    redis.set(keys.pause, "x", 60);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({ reason: "paused" });
    redis.set(keys.kill, "x");
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({ reason: "killed" });
  });
});

describe("place vivante vérifiée par RESERVE (D3)", () => {
  it("requête jamais admise → refus", async () => {
    expect(await circuit.reserve({ callId: id("call"), requestId: id("req"), visitor: vid(1), nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "slot_expired",
    });
  });

  it("place expirée → refus, aucun compteur modifié", async () => {
    const visitor = vid(2);
    const requestId = await admitOk(circuit, redis, visitor);
    redis.advance(CONCURRENCY_SLOT_TTL_MS + 1);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "slot_expired",
    });
    expect(redis.peekNumber(keys.spendDay(redis.now()))).toBe(0);
  });

  it("place pile à l'expiration (score = now) → refus", async () => {
    const visitor = vid(3);
    const requestId = await admitOk(circuit, redis, visitor);
    redis.advance(CONCURRENCY_SLOT_TTL_MS);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "slot_expired",
    });
  });

  it("requête libérée → refus", async () => {
    const visitor = vid(4);
    const requestId = await admitOk(circuit, redis, visitor);
    await circuit.release({ requestId, visitor });
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "slot_expired",
    });
  });

  it("autre visiteur que celui admis → refus", async () => {
    const requestId = await admitOk(circuit, redis, vid(5));
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor: vid(6), nowMs: redis.now() })).toMatchObject({
      reason: "slot_expired",
    });
  });

  it("place globale retirée alors que l'état de requête existe → refus", async () => {
    const visitor = vid(7);
    const requestId = await admitOk(circuit, redis, visitor);
    redis.del(keys.concurrencyGlobal);
    expect(await circuit.reserve({ callId: id("call"), requestId, visitor, nowMs: redis.now() })).toMatchObject({
      reason: "slot_expired",
    });
  });
});

describe("pause sur 429 sans retry-after (D1)", () => {
  it("1er 429 → pause globale, pas de kill ; la pause expire automatiquement", async () => {
    const d = await circuit.record429WithoutRetryAfter({ nowMs: redis.now() });
    expect(d).toMatchObject({ ok: true, paused: true, killed: false });
    expect(redis.peek(keys.kill)).toBeNull();
    expect(await circuit.admit({ requestId: id("req"), visitor: vid(1), nowMs: redis.now() })).toMatchObject({ reason: "paused" });
    redis.advance(PAUSE_429_DURATION_SECONDS * 1000 + 1);
    expect((await circuit.admit({ requestId: id("req"), visitor: vid(1), nowMs: redis.now() })).allowed).toBe(true);
  });

  it("problème persistant : 3e occurrence dans l'heure → kill", async () => {
    await circuit.record429WithoutRetryAfter({ nowMs: redis.now() });
    redis.advance(PAUSE_429_DURATION_SECONDS * 1000 + 1_000);
    await circuit.record429WithoutRetryAfter({ nowMs: redis.now() });
    expect(redis.peek(keys.kill)).toBeNull();
    redis.advance(PAUSE_429_DURATION_SECONDS * 1000 + 1_000);
    const third = await circuit.record429WithoutRetryAfter({ nowMs: redis.now() });
    expect(third).toMatchObject({ ok: true, killed: true });
    expect(redis.peek(keys.kill)).toBe("429_sans_retry_after_persistant");
  });

  it("occurrences espacées de plus d'une fenêtre longue : jamais de kill", async () => {
    for (let i = 0; i < 5; i += 1) {
      const d = await circuit.record429WithoutRetryAfter({ nowMs: redis.now() });
      expect(d).toMatchObject({ killed: false });
      redis.advance(KILL_429_WINDOW_SECONDS * 1000 + 1_000);
    }
    expect(redis.peek(keys.kill)).toBeNull();
  });
});

describe("idempotence", () => {
  it("même call_id deux fois : une seule réservation, second appel refusé", async () => {
    const visitor = vid(1);
    const requestId = await admitOk(circuit, redis, visitor);
    const callId = id("call");
    const r = await reserveOk(circuit, redis, visitor, requestId, callId);
    expect(await circuit.reserve({ callId, requestId, visitor, nowMs: redis.now() })).toEqual({
      allowed: false,
      reason: "duplicate_call",
    });
    expect(redis.peekNumber(r.keys.day)).toBe(RESERVATION_NANO);
  });

  it("settlement exécuté deux fois : un seul effet", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    const settle = () =>
      circuit.settle({ reservation: r, actualNano: 50_000_000, countedTokens: 5_000, billedInputTokens: 5_000 });
    expect(await settle()).toMatchObject({ ok: true, outcome: "settled" });
    expect(await settle()).toMatchObject({ ok: true, outcome: "replay" });
    expect(redis.peekNumber(r.keys.day)).toBe(50_000_000);
    expect(redis.peekNumber(r.keys.visitor)).toBe(50_000_000);
  });

  it("release exécuté deux fois : une seule place libérée", async () => {
    const visitor = vid(1);
    const a = await admitOk(circuit, redis, visitor);
    await admitOk(circuit, redis, visitor);
    expect(await circuit.release({ requestId: a, visitor })).toBe(true);
    expect(await circuit.release({ requestId: a, visitor })).toBe(true);
    expect(redis.zcard(keys.concurrencyVisitor(visitor))).toBe(1);
    expect(redis.zcard(keys.concurrencyGlobal)).toBe(1);
  });

  it("admission rejouée (retry réseau) : aucun double comptage", async () => {
    const visitor = vid(1);
    const requestId = id("req");
    await circuit.admit({ requestId, visitor, nowMs: redis.now() });
    expect(await circuit.admit({ requestId, visitor, nowMs: redis.now() })).toEqual({ allowed: true });
    expect(redis.zcard(keys.concurrencyVisitor(visitor))).toBe(1);
    expect(redis.peekNumber(keys.rateMinute(visitor, redis.now()))).toBe(1);
  });
});

describe("règlement", () => {
  it("restitution à 0 $ : compteurs revenus à zéro, jamais négatifs", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    await circuit.settle({ reservation: r, actualNano: 0, countedTokens: 0, billedInputTokens: 0 });
    expect(redis.peekNumber(r.keys.day)).toBe(0);
    const r2 = await reserveOk(circuit, redis, vid(2));
    redis.del(r2.keys.day);
    await circuit.settle({ reservation: r2, actualNano: 0, countedTokens: 0, billedInputTokens: 0 });
    expect(redis.peekNumber(r2.keys.day)).toBe(0);
  });

  it("coût réel > réservation : compteurs au coût réel et kill global", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    const decision = await circuit.settle({
      reservation: r,
      actualNano: RESERVATION_NANO + 1,
      countedTokens: 1_000,
      billedInputTokens: 1_000,
    });
    expect(decision).toMatchObject({ ok: true, overCost: true, killSet: true });
    expect(redis.peek(keys.kill)).toBe("cout_reel_superieur_reservation");
    expect(redis.peekNumber(r.keys.day)).toBe(RESERVATION_NANO + 1);
  });

  it("écart de comptage > 5 % : kill ; ≤ 5 % : pas de kill", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    expect(
      await circuit.settle({ reservation: r, actualNano: 10_000_000, countedTokens: 10_000, billedInputTokens: 10_500 })
    ).toMatchObject({ ok: true, countDrift: false, killSet: false });
    const r2 = await reserveOk(circuit, redis, vid(2));
    expect(
      await circuit.settle({ reservation: r2, actualNano: 10_000_000, countedTokens: 10_000, billedInputTokens: 10_501 })
    ).toMatchObject({ ok: true, countDrift: true, killSet: true });
  });

  it("utilise les périodes mémorisées, même après minuit", async () => {
    redis.advance(23 * HOUR + 59 * 60_000);
    const r = await reserveOk(circuit, redis, vid(1));
    redis.advance(2 * 60_000);
    await circuit.settle({ reservation: r, actualNano: 1_000, countedTokens: 100, billedInputTokens: 100 });
    expect(redis.peekNumber(r.keys.day)).toBe(1_000);
    expect(redis.peekNumber(keys.spendDay(redis.now()))).toBe(0);
  });

  it("refuse un règlement dont les clés ne correspondent pas à la réservation", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    const forged = { ...r, keys: { ...r.keys, visitor: keys.spendVisitorDay(vid(2), redis.now()) } };
    expect(await circuit.settle({ reservation: forged, actualNano: 0, countedTokens: 0, billedInputTokens: 0 })).toEqual({
      ok: false,
      reason: "key_mismatch",
    });
    expect(redis.peekNumber(r.keys.day)).toBe(RESERVATION_NANO);
  });

  it("alertes 60 % et 80 % émises une seule fois", async () => {
    const alerts: string[] = [];
    for (let hour = 0; hour < 3; hour += 1) {
      const visitors = [0, 1].map((v) => vid(`alerte-${hour}-${v}`));
      const reqs = await Promise.all(visitors.map((v) => admitOk(circuit, redis, v)));
      for (let i = 0; i < 14; i += 1) {
        const d = await circuit.reserve({ callId: id("call"), requestId: reqs[i % 2], visitor: visitors[i % 2], nowMs: redis.now() });
        if (d.allowed) alerts.push(...d.alerts);
      }
      redis.advance(HOUR);
    }
    expect(alerts).toEqual(["budget_day_60", "budget_day_80"]);
  });
});

describe("crash", () => {
  it("réservation sans règlement : reste comptée, même après expiration de l'état d'appel", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    redis.advance((TTL_CALL_SECONDS + 1) * 1000);
    expect(await circuit.settle({ reservation: r, actualNano: 0, countedTokens: 0, billedInputTokens: 0 })).toEqual({
      ok: false,
      reason: "unknown_reservation",
    });
    expect(redis.peekNumber(r.keys.day)).toBe(RESERVATION_NANO);
  });

  it("place de concurrence libérée par expiration après un crash", async () => {
    for (let i = 0; i < 8; i += 1) await admitOk(circuit, redis, vid(i));
    expect((await circuit.admit({ requestId: id("req"), visitor: vid(50), nowMs: redis.now() })).allowed).toBe(false);
    redis.advance(CONCURRENCY_SLOT_TTL_MS + 1);
    expect((await circuit.admit({ requestId: id("req"), visitor: vid(50), nowMs: redis.now() })).allowed).toBe(true);
  });

  it("aucune expiration ne rend un budget avant la fin de sa période", async () => {
    const r = await reserveOk(circuit, redis, vid(1));
    expect(redis.ttlSeconds(r.keys.day)).toBeGreaterThanOrEqual(24 * 3600);
    expect(redis.ttlSeconds(r.keys.visitor)).toBeGreaterThanOrEqual(24 * 3600);
    expect(redis.ttlSeconds(r.keys.hour)).toBeGreaterThanOrEqual(3600);
  });
});

describe("concurrence, instances multiples et rotation d'IP", () => {
  it("50 réservations simultanées sur 4 instances : jamais plus de 3,60 $/h, 2 $/visiteur", async () => {
    const instances = Array.from({ length: 4 }, () => newCircuit(redis, 5));
    const visitors = Array.from({ length: 8 }, (_, v) => vid(`conc-${v}`));
    const reqs = await Promise.all(visitors.map((v) => admitOk(circuit, redis, v)));
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        instances[i % 4].reserve({ callId: id("call"), requestId: reqs[i % 8], visitor: visitors[i % 8], nowMs: redis.now() })
      )
    );
    expect(results.filter((r) => r.allowed).length).toBe(14);
    expect(redis.peekNumber(keys.spendHour(redis.now()))).toBe(14 * RESERVATION_NANO);
    for (const v of visitors) {
      expect(redis.peekNumber(keys.spendVisitorDay(v, redis.now()))).toBeLessThanOrEqual(BUDGET_VISITOR_DAY_NANO);
    }
  });

  it("rotation sur 10 IP : le budget global reste strictement borné à 9 $/jour", async () => {
    const instances = Array.from({ length: 3 }, () => newCircuit(redis, 3));
    let granted = 0;
    for (let hour = 0; hour < 5; hour += 1) {
      const visitors = Array.from({ length: 8 }, (_, v) => vid(`rot-${hour}-${v}`));
      const reqs = await Promise.all(visitors.map((v) => admitOk(circuit, redis, v)));
      const batch = await Promise.all(
        Array.from({ length: 40 }, (_, i) =>
          instances[i % 3].reserve({ callId: id("call"), requestId: reqs[i % 8], visitor: visitors[i % 8], nowMs: redis.now() })
        )
      );
      granted += batch.filter((r) => r.allowed).length;
      await Promise.all(visitors.map((v, i) => circuit.release({ requestId: reqs[i], visitor: v })));
      redis.advance(HOUR);
    }
    expect(granted).toBe(36);
    expect(redis.peekNumber(keys.spendDay(Date.UTC(2026, 8, 17)))).toBeLessThanOrEqual(BUDGET_GLOBAL_DAY_NANO);
  });

  it("20 admissions simultanées de 10 visiteurs sur 4 instances : 8 admises, ≤ 2 par visiteur, 0 après RELEASE", async () => {
    const instances = Array.from({ length: 4 }, () => newCircuit(redis, 5));
    const attempts = Array.from({ length: 20 }, (_, i) => ({ requestId: id("req"), visitor: vid(i % 10) }));
    const results = await Promise.all(attempts.map((a, i) => instances[i % 4].admit({ ...a, nowMs: redis.now() })));
    expect(results.filter((r) => r.allowed).length).toBe(8);
    expect(redis.zcard(keys.concurrencyGlobal)).toBe(8);
    for (let v = 0; v < 10; v += 1) expect(redis.zcard(keys.concurrencyVisitor(vid(v)))).toBeLessThanOrEqual(2);
    await Promise.all(attempts.map((a, i) => (results[i].allowed ? instances[i % 4].release(a) : Promise.resolve(false))));
    expect(redis.zcard(keys.concurrencyGlobal)).toBe(0);
  });
});
