import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceCircuit } from "@/lib/ai/finance/circuit";
import { runGuardedModelCall, type CallOptions, type ModelAttempt } from "@/lib/ai/finance/guarded-call";
import { financeKeys } from "@/lib/ai/finance/keys";
import { MODEL_CALL_TIMEOUT_MS, RESERVATION_NANO } from "@/lib/ai/finance/limits";
import { FakeRedis } from "./fake-redis";
import { admitOk, id, newCircuit, vid } from "./helpers";

const keys = financeKeys("test");
const VISITOR = vid("guarded");

let redis: FakeRedis;
let circuit: FinanceCircuit;
let requestId: string;

const usage = { input_tokens: 2_000, output_tokens: 300, cache_read_input_tokens: 4_406, cache_creation_input_tokens: 0 };
const expectedCost = 2_000 * 5_500 + 4_406 * 550 + 300 * 27_500;

beforeEach(async () => {
  redis = new FakeRedis(Date.UTC(2026, 8, 17, 10, 0, 0));
  circuit = newCircuit(redis);
  requestId = await admitOk(circuit, redis, VISITOR);
});

interface RunOptions {
  counted?: number | Error;
  remainingMs?: number;
  signal?: AbortSignal;
  countImpl?: (o: CallOptions) => Promise<number>;
  callImpl?: (o: CallOptions) => Promise<ModelAttempt<string>>;
}

function run(attempts: ModelAttempt<string>[], options: RunOptions = {}) {
  const queue = [...attempts];
  const callModel = vi.fn(
    options.callImpl ??
      (async () => {
        const next = queue.shift();
        if (!next) throw new Error("appel modèle inattendu");
        return next;
      })
  );
  const countTokens = vi.fn(
    options.countImpl ??
      (async () => {
        if (options.counted instanceof Error) throw options.counted;
        return options.counted ?? 6_500;
      })
  );
  const reserveSpy = vi.spyOn(circuit, "reserve");
  const sleep = vi.fn(async () => {});
  const events: unknown[] = [];
  const deadlineAt = redis.now() + (options.remainingMs ?? 200_000);
  const promise = runGuardedModelCall({
    circuit,
    visitor: VISITOR,
    requestId,
    callId: id("call"),
    deadlineAt,
    now: () => redis.now(),
    signal: options.signal ?? new AbortController().signal,
    countTokens,
    callModel,
    sleep,
    onEvent: (e) => events.push(e),
  });
  return { promise, callModel, countTokens, reserveSpy, sleep, events };
}

const dayTotal = () => redis.peekNumber(keys.spendDay(redis.now()));

describe("échéance : budget de 53 s par tour", () => {
  it("53 000 ms restants : tour accepté", async () => {
    const { promise, callModel } = run([{ kind: "success", value: "ok", usage }], { remainingMs: 53_000 });
    expect(await promise).toMatchObject({ status: "ok" });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("52 999 ms restants : refus sans comptage, sans réservation, sans appel", async () => {
    const { promise, callModel, countTokens, reserveSpy } = run([], { remainingMs: 52_999 });
    expect(await promise).toEqual({ status: "refused", reason: "deadline", modelCalled: false });
    expect(countTokens).not.toHaveBeenCalled();
    expect(reserveSpy).not.toHaveBeenCalled();
    expect(callModel).not.toHaveBeenCalled();
  });

  it("l'appel reçoit un délai de 45 s exactement quand le tour démarre à 53 s", async () => {
    const { promise, callModel } = run([{ kind: "success", value: "ok", usage }], { remainingMs: 53_000 });
    await promise;
    expect(callModel.mock.calls[0][0].timeoutMs).toBe(MODEL_CALL_TIMEOUT_MS);
  });

  it("comptage trop lent (> 5 s) : refus, aucune réservation", async () => {
    vi.useFakeTimers();
    try {
      const { promise, reserveSpy, callModel } = run([], {
        countImpl: () => new Promise(() => {}),
      });
      await vi.advanceTimersByTimeAsync(5_001);
      expect(await promise).toMatchObject({ status: "refused", reason: "count_error" });
      expect(reserveSpy).not.toHaveBeenCalled();
      expect(callModel).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("le comptage reçoit ≤ 5 s", async () => {
    const { promise, countTokens } = run([{ kind: "success", value: "ok", usage }]);
    await promise;
    expect(countTokens.mock.calls[0][0].timeoutMs).toBe(5_000);
  });
});

describe("plafond d'entrée : comptage avant réservation", () => {
  it("28 571 tokens : accepté", async () => {
    const { promise } = run([{ kind: "success", value: "ok", usage }], { counted: 28_571 });
    expect(await promise).toMatchObject({ status: "ok" });
  });

  it("28 572 tokens : refus, aucune réservation, aucun appel", async () => {
    const { promise, callModel, reserveSpy } = run([], { counted: 28_572 });
    expect(await promise).toMatchObject({ status: "refused", reason: "input_cap" });
    expect(reserveSpy).not.toHaveBeenCalled();
    expect(callModel).not.toHaveBeenCalled();
    expect(dayTotal()).toBe(0);
  });

  it("le comptage précède toujours la réservation", async () => {
    const order: string[] = [];
    const originalReserve = circuit.reserve.bind(circuit);
    vi.spyOn(circuit, "reserve").mockImplementation(async (input) => {
      order.push("reserve");
      return originalReserve(input);
    });
    const { promise } = run([], {
      countImpl: async () => {
        order.push("count");
        return 1_000;
      },
      callImpl: async () => {
        order.push("call");
        return { kind: "success", value: "ok", usage };
      },
    });
    await promise;
    expect(order).toEqual(["count", "reserve", "call"]);
  });

  it("erreur de comptage : aucune réservation, aucun appel", async () => {
    const { promise, callModel } = run([], { counted: new Error("count_tokens indisponible") });
    expect(await promise).toMatchObject({ status: "refused", reason: "count_error" });
    expect(callModel).not.toHaveBeenCalled();
    expect(dayTotal()).toBe(0);
  });
});

describe("refus du circuit : aucun appel", () => {
  it("budget atteint", async () => {
    redis.set(keys.spendDay(redis.now()), "8900000000", 3600);
    const { promise, callModel } = run([{ kind: "success", value: "x", usage }]);
    expect(await promise).toMatchObject({ status: "refused", reason: "budget_day" });
    expect(callModel).not.toHaveBeenCalled();
  });

  it("kill actif", async () => {
    redis.set(keys.kill, "manuel");
    const { promise, callModel } = run([{ kind: "success", value: "x", usage }]);
    expect(await promise).toMatchObject({ status: "refused", reason: "killed" });
    expect(callModel).not.toHaveBeenCalled();
  });

  it("place expirée", async () => {
    redis.advance(270_001);
    const { promise, callModel } = run([{ kind: "success", value: "x", usage }]);
    expect(await promise).toMatchObject({ status: "refused", reason: "slot_expired" });
    expect(callModel).not.toHaveBeenCalled();
  });
});

describe("règlement et retries", () => {
  it("succès : réservation remplacée par le coût réel", async () => {
    const { promise, callModel } = run([{ kind: "success", value: "réponse", usage, anthropicRequestId: "req_1" }]);
    expect(await promise).toMatchObject({
      status: "ok",
      value: "réponse",
      costNano: expectedCost,
      settleFailed: false,
      anthropicRequestId: "req_1",
      usage: { inputTokens: 2_000, outputTokens: 300, cacheReadTokens: 4_406, cacheWriteTokens: 0 },
    });
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(dayTotal()).toBe(expectedCost);
  });

  it("429 avec retry-after : un seul retry, même réservation", async () => {
    const { promise, callModel, sleep } = run([
      { kind: "http_error", status: 429, retryAfterMs: 2_000 },
      { kind: "success", value: "ok", usage },
    ]);
    expect(await promise).toMatchObject({ status: "ok", attempts: 2 });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000, expect.anything());
    expect(dayTotal()).toBe(expectedCost);
  });

  it("500 puis 500 : un seul retry, puis restitution", async () => {
    const { promise, callModel } = run([
      { kind: "http_error", status: 500 },
      { kind: "http_error", status: 500 },
      { kind: "success", value: "jamais", usage },
    ]);
    expect(await promise).toMatchObject({ status: "failed", reason: "http_error", refunded: true, attempts: 2 });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(dayTotal()).toBe(0);
  });

  it("529 puis succès : un seul retry", async () => {
    const { promise, callModel } = run([
      { kind: "http_error", status: 529 },
      { kind: "success", value: "ok", usage },
    ]);
    expect(await promise).toMatchObject({ status: "ok" });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("retry refusé si attente + 45 s + 1,5 s dépasse le temps restant", async () => {
    // Restant au moment de la décision ≈ 53 s ; attente 7 s → 7 + 45 + 1,5 = 53,5 s > 53 s.
    const { promise, callModel } = run([{ kind: "http_error", status: 429, retryAfterMs: 7_000 }], { remainingMs: 53_000 });
    expect(await promise).toMatchObject({ status: "failed", reason: "http_error", refunded: true, attempts: 1 });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("retry accepté pile à la limite (attente + 46,5 s = restant)", async () => {
    const { promise, callModel } = run(
      [{ kind: "http_error", status: 429, retryAfterMs: 6_500 }, { kind: "success", value: "ok", usage }],
      { remainingMs: 53_000 }
    );
    expect(await promise).toMatchObject({ status: "ok", attempts: 2 });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 408, 409, 413, 502, 503, 504])("HTTP %i : aucun retry, restitution", async (status) => {
    const { promise, callModel } = run([{ kind: "http_error", status }, { kind: "success", value: "jamais", usage }]);
    expect(await promise).toMatchObject({ status: "failed", reason: "http_error", refunded: true });
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(dayTotal()).toBe(0);
  });

  it("429 sans retry-after : aucun retry, restitution, PAUSE (pas de kill)", async () => {
    const { promise, callModel, events } = run([{ kind: "http_error", status: 429 }]);
    expect(await promise).toMatchObject({ status: "failed", reason: "rate_limited", refunded: true, paused: true, killed: false });
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(redis.peek(keys.kill)).toBeNull();
    expect(redis.peek(keys.pause)).toBe("429_sans_retry_after");
    expect(events).toContainEqual({ type: "pause", reason: "429_sans_retry_after" });
    expect(dayTotal()).toBe(0);
  });

  it("plafond de dépense explicite : aucun retry, restitution, KILL", async () => {
    const { promise, callModel } = run([{ kind: "http_error", status: 400, spendLimit: true }]);
    expect(await promise).toMatchObject({ status: "failed", reason: "spend_limit", refunded: true, killed: true });
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(redis.peek(keys.kill)).toBe("plafond_depense_anthropic");
  });

  it("429 avec retry-after mais signal de plafond : aucun retry, kill", async () => {
    const { promise, callModel } = run([{ kind: "http_error", status: 429, retryAfterMs: 1_000, spendLimit: true }]);
    expect(await promise).toMatchObject({ reason: "spend_limit" });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it.each(["timeout", "aborted", "network", "exception"] as const)(
    "interruption (%s) : aucun retry, réservation conservée",
    async (cause) => {
      const { promise, callModel } = run([
        { kind: "interrupted", cause },
        { kind: "success", value: "jamais", usage },
      ]);
      expect(await promise).toMatchObject({ status: "failed", reason: "interrupted", refunded: false, cause });
      expect(callModel).toHaveBeenCalledTimes(1);
      expect(dayTotal()).toBe(RESERVATION_NANO);
    }
  );

  it("exception levée par le fournisseur : capturée, réservation conservée", async () => {
    const { promise } = run([], {
      callImpl: async () => {
        throw new Error("boom");
      },
    });
    expect(await promise).toMatchObject({ status: "failed", reason: "interrupted", cause: "exception" });
    expect(dayTotal()).toBe(RESERVATION_NANO);
  });

  it("appel qui ne répond jamais : interrompu à 45 s, réservation conservée", async () => {
    vi.useFakeTimers();
    try {
      let receivedSignal: AbortSignal | undefined;
      const { promise } = run([], {
        callImpl: (o) => {
          receivedSignal = o.signal;
          return new Promise(() => {});
        },
      });
      await vi.advanceTimersByTimeAsync(45_001);
      expect(await promise).toMatchObject({ status: "failed", reason: "interrupted", cause: "timeout" });
      expect(receivedSignal?.aborted).toBe(true);
      expect(dayTotal()).toBe(RESERVATION_NANO);
    } finally {
      vi.useRealTimers();
    }
  });

  it("annulation client pendant l'appel : abort propagé, aucun retry, réservation conservée", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const { promise, callModel } = run([], {
      signal: controller.signal,
      callImpl: (o) => {
        receivedSignal = o.signal;
        setTimeout(() => controller.abort(), 5);
        return new Promise(() => {});
      },
    });
    expect(await promise).toMatchObject({ status: "failed", reason: "interrupted", cause: "aborted" });
    expect(receivedSignal?.aborted).toBe(true);
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(dayTotal()).toBe(RESERVATION_NANO);
  });

  it("déjà annulé avant le tour : aucun comptage", async () => {
    const controller = new AbortController();
    controller.abort();
    const { promise, countTokens } = run([], { signal: controller.signal });
    expect(await promise).toMatchObject({ status: "refused", reason: "aborted" });
    expect(countTokens).not.toHaveBeenCalled();
  });

  it("usage absent : réservation conservée", async () => {
    const { promise } = run([{ kind: "success", value: "x", usage: undefined }]);
    expect(await promise).toMatchObject({ status: "failed", reason: "usage_missing", refunded: false });
    expect(dayTotal()).toBe(RESERVATION_NANO);
  });

  it.each([
    ["cache 1 h", { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 100, cache_creation: { ephemeral_1h_input_tokens: 100 } }],
    ["tier prioritaire", { input_tokens: 10, output_tokens: 10, service_tier: "priority" }],
    ["outil serveur", { input_tokens: 10, output_tokens: 10, server_tool_use: { web_search_requests: 1 } }],
  ])("usage interdit (%s) : kill", async (_label, forbidden) => {
    const { promise } = run([{ kind: "success", value: "x", usage: forbidden }]);
    expect(await promise).toMatchObject({ status: "ok", killSet: true });
    expect(redis.peek(keys.kill)).toBe("usage_interdit");
  });

  it("entrée facturée > comptage × 1,05 : kill", async () => {
    const { promise } = run([{ kind: "success", value: "x", usage: { input_tokens: 7_000, output_tokens: 10 } }], { counted: 6_000 });
    expect(await promise).toMatchObject({ status: "ok", killSet: true, countDrift: true });
    expect(redis.peek(keys.kill)).toBe("ecart_comptage_superieur_marge");
  });

  it("règlement impossible (Redis en panne après l'appel) : réservation conservée, settleFailed", async () => {
    const { promise } = run([], {
      callImpl: async () => {
        vi.spyOn(circuit, "settle").mockResolvedValue({ ok: false, reason: "store_unavailable" });
        return { kind: "success", value: "ok", usage };
      },
    });
    expect(await promise).toMatchObject({ status: "ok", settleFailed: true });
    expect(dayTotal()).toBe(RESERVATION_NANO);
  });

  it("jamais plus de 2 appels, quelle que soit la séquence d'erreurs", async () => {
    const { promise, callModel } = run([
      { kind: "http_error", status: 529 },
      { kind: "http_error", status: 529 },
      { kind: "http_error", status: 529 },
    ]);
    await promise;
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});
