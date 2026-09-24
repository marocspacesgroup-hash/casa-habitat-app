import { describe, expect, it } from "vitest";
import {
  DEFERRED_RECOVERY_DELAYS_MS,
  DEFERRED_RECOVERY_WINDOW_MS,
  REDIS_TIMEOUT_MS,
  REQUEST_DEADLINE_MS,
  STORE_OPERATION_MAX_RETRIES,
  STORE_RETRY_BACKOFF_MS,
  TURN_BUDGET_MS,
  VERCEL_MAX_DURATION_SECONDS,
} from "@/lib/ai/finance/limits";

describe("limites de réconciliation (C.3.3)", () => {
  it("délais existants inchangés : 1 500 ms par opération, échéance 210 s, tour 53 s", () => {
    expect(REDIS_TIMEOUT_MS).toBe(1_500);
    expect(REQUEST_DEADLINE_MS).toBe(210_000);
    expect(TURN_BUDGET_MS).toBe(53_000);
  });

  it("au plus une relance, après 250 ms", () => {
    expect(STORE_OPERATION_MAX_RETRIES).toBe(1);
    expect(STORE_RETRY_BACKOFF_MS).toBe(250);
  });

  it("la reprise différée tient dans la durée maximale de la fonction, marge de 10 s", () => {
    const worst = DEFERRED_RECOVERY_DELAYS_MS.reduce((sum, d) => sum + d + REDIS_TIMEOUT_MS, 0);
    expect(DEFERRED_RECOVERY_WINDOW_MS).toBe(80_000);
    expect(worst).toBeLessThan(DEFERRED_RECOVERY_WINDOW_MS);
    expect(REQUEST_DEADLINE_MS + DEFERRED_RECOVERY_WINDOW_MS).toBeLessThanOrEqual(VERCEL_MAX_DURATION_SECONDS * 1_000 - 10_000);
  });
});
