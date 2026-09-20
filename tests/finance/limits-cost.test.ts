import { describe, expect, it } from "vitest";
import { actualCost, exceedsInputCap, isUsableUsage } from "@/lib/ai/finance/cost";
import {
  ALERT_60_NANO,
  ALERT_80_NANO,
  BODY_MAX_BYTES,
  BODY_READ_TIMEOUT_MS,
  BUDGET_GLOBAL_DAY_NANO,
  BUDGET_GLOBAL_HOUR_NANO,
  BUDGET_VISITOR_DAY_NANO,
  CLOCK_SKEW_MARGIN_MS,
  CONCURRENCY_SLOT_TTL_MS,
  COUNT_TOKENS_TIMEOUT_MS,
  FINAL_TURN_THRESHOLD_MS,
  HISTORY_MAX_CHARS,
  HISTORY_MAX_MESSAGES,
  KILL_429_THRESHOLD,
  KILL_429_WINDOW_SECONDS,
  MAX_TURNS_PER_MESSAGE,
  MESSAGE_MAX_CHARS,
  MODEL_CALL_TIMEOUT_MS,
  MODEL_ID,
  OUTPUT_CAP_TOKENS,
  PAUSE_429_DURATION_SECONDS,
  PAUSE_429_THRESHOLD,
  PRICE_NANO_PER_TOKEN,
  REDIS_TIMEOUT_MS,
  REQUEST_DEADLINE_MS,
  RESERVATION_NANO,
  RESULTS_PER_REQUEST_MAX,
  RESULTS_PER_SEARCH_MAX,
  TOOL_CALLS_PER_REQUEST_MAX,
  TOOL_CALLS_PER_TURN_MAX,
  TOOL_RESULT_MAX_BYTES,
  TOOLS_TURN_TIMEOUT_MS,
  TURN_BUDGET_MS,
  VERCEL_MAX_DURATION_SECONDS,
} from "@/lib/ai/finance/limits";

describe("limites verrouillées", () => {
  it("réserve exactement 0,2475 $ par appel", () => {
    expect(RESERVATION_NANO).toBe(247_500_000);
  });

  it("applique les budgets décidés", () => {
    expect(BUDGET_GLOBAL_DAY_NANO).toBe(9_000_000_000);
    expect(BUDGET_GLOBAL_HOUR_NANO).toBe(3_600_000_000);
    expect(BUDGET_VISITOR_DAY_NANO).toBe(2_000_000_000);
    expect(ALERT_60_NANO).toBe(5_400_000_000);
    expect(ALERT_80_NANO).toBe(7_200_000_000);
    expect(MAX_TURNS_PER_MESSAGE).toBe(3);
    expect(REDIS_TIMEOUT_MS).toBe(1_500);
  });

  it("intègre le facteur 1,1 dans des tarifs entiers", () => {
    expect(PRICE_NANO_PER_TOKEN).toEqual({
      input: 5_500,
      cacheWrite5m: 6_875,
      cacheWrite1h: 11_000,
      cacheRead: 550,
      output: 27_500,
    });
  });

  it("libère une place de concurrence après 2 × la durée maximale d'une requête", () => {
    expect(CONCURRENCY_SLOT_TTL_MS).toBe(270_000);
  });

  it("couvre 8 appels par visiteur, 14 par heure et 36 par jour", () => {
    expect(Math.floor(BUDGET_VISITOR_DAY_NANO / RESERVATION_NANO)).toBe(8);
    expect(Math.floor(BUDGET_GLOBAL_HOUR_NANO / RESERVATION_NANO)).toBe(14);
    expect(Math.floor(BUDGET_GLOBAL_DAY_NANO / RESERVATION_NANO)).toBe(36);
  });
});

describe("invariants temporels et limites P4.2-B", () => {
  it("tour = 5 + 1,5 + 45 + 1,5 = 53 s ; tour final sous 53 + 15 + 53 = 121 s", () => {
    expect(TURN_BUDGET_MS).toBe(53_000);
    expect(FINAL_TURN_THRESHOLD_MS).toBe(121_000);
  });

  it("échéance + RELEASE + marge d'horloge < TTL de la place (270 s)", () => {
    expect(REQUEST_DEADLINE_MS).toBe(210_000);
    expect(CONCURRENCY_SLOT_TTL_MS).toBe(270_000);
    expect(REQUEST_DEADLINE_MS + REDIS_TIMEOUT_MS + CLOCK_SKEW_MARGIN_MS).toBeLessThan(CONCURRENCY_SLOT_TTL_MS);
  });

  it("échéance + RELEASE < durée maximale Vercel (300 s)", () => {
    expect(REQUEST_DEADLINE_MS + REDIS_TIMEOUT_MS).toBeLessThan(VERCEL_MAX_DURATION_SECONDS * 1000);
  });

  it("limites de délai, d'outils et de requête verrouillées", () => {
    expect([BODY_READ_TIMEOUT_MS, COUNT_TOKENS_TIMEOUT_MS, MODEL_CALL_TIMEOUT_MS, TOOLS_TURN_TIMEOUT_MS]).toEqual([
      10_000, 5_000, 45_000, 15_000,
    ]);
    expect([TOOL_CALLS_PER_TURN_MAX, TOOL_CALLS_PER_REQUEST_MAX, RESULTS_PER_SEARCH_MAX, RESULTS_PER_REQUEST_MAX]).toEqual([3, 4, 5, 12]);
    expect(TOOL_RESULT_MAX_BYTES).toBe(6_144);
    expect([MESSAGE_MAX_CHARS, HISTORY_MAX_MESSAGES, HISTORY_MAX_CHARS, BODY_MAX_BYTES]).toEqual([1_500, 12, 6_000, 65_536]);
    expect(MODEL_ID).toBe("claude-opus-5");
    expect(OUTPUT_CAP_TOKENS).toBe(1_500);
  });

  it("pause 429 : dès le 1er 429 sans retry-after, kill au 3e dans l'heure", () => {
    expect([PAUSE_429_THRESHOLD, PAUSE_429_DURATION_SECONDS, KILL_429_THRESHOLD, KILL_429_WINDOW_SECONDS]).toEqual([1, 300, 3, 3_600]);
  });
});

describe("plafond d'entrée (comptage × 1,05 ≤ 30 000)", () => {
  it("accepte 28 571 tokens et refuse 28 572", () => {
    expect(exceedsInputCap(28_571)).toBe(false);
    expect(exceedsInputCap(28_572)).toBe(true);
  });

  it("refuse un comptage invalide", () => {
    expect(exceedsInputCap(-1)).toBe(true);
    expect(exceedsInputCap(1.5)).toBe(true);
    expect(exceedsInputCap(Number.NaN)).toBe(true);
  });
});

describe("coût réel", () => {
  it("calcule chaque poste au tarif × 1,1", () => {
    const cost = actualCost({
      input_tokens: 1_000,
      output_tokens: 200,
      cache_creation_input_tokens: 4_406,
      cache_read_input_tokens: 0,
    });
    expect(cost.costNano).toBe(1_000 * 5_500 + 4_406 * 6_875 + 200 * 27_500);
    expect(cost.billedInputTokens).toBe(5_406);
    expect(cost.forbiddenUsage).toBe(false);
  });

  it("le pire cas autorisé ne dépasse jamais la réservation", () => {
    const worst = actualCost({
      input_tokens: 0,
      output_tokens: 1_500,
      cache_creation_input_tokens: 30_000,
      cache_read_input_tokens: 0,
    });
    expect(worst.costNano).toBe(RESERVATION_NANO);
  });

  it("signale l'usage interdit du cache 1 h", () => {
    const cost = actualCost({
      input_tokens: 10,
      output_tokens: 10,
      cache_creation_input_tokens: 100,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 100 },
    });
    expect(cost.forbiddenUsage).toBe(true);
    expect(cost.costNano).toBe(10 * 5_500 + 100 * 11_000 + 10 * 27_500);
  });

  it("rejette un usage inexploitable", () => {
    expect(isUsableUsage(undefined)).toBe(false);
    expect(isUsableUsage({ input_tokens: 10 })).toBe(false);
    expect(isUsableUsage({ input_tokens: -1, output_tokens: 2 })).toBe(false);
    expect(isUsableUsage({ input_tokens: 1, output_tokens: 2 })).toBe(true);
  });
});
