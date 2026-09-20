import type {
  CancelDecision,
  FinanceAlert,
  FinanceCircuit,
  Reservation,
  ReserveRefusal,
  SettleDecision,
  SettleInput,
} from "./circuit";
import { actualCost, exceedsInputCap, isUsableUsage, type ModelUsage } from "./cost";
import {
  APP_RETRY_DELAY_MS,
  CANCEL_SYNC_WAIT_MS,
  COUNT_TOKENS_TIMEOUT_MS,
  DEFERRED_RECOVERY_WINDOW_MS,
  MODEL_CALL_TIMEOUT_MS,
  REDIS_TIMEOUT_MS,
  RETRY_SAFETY_MARGIN_MS,
  STORE_RETRY_BACKOFF_MS,
  TURN_BUDGET_MS,
} from "./limits";
import {
  deferReconciliation,
  reconcileWithRetry,
  runDeferredAttempts,
  safeKillReason,
  settleWithin,
  type Defer,
} from "./recovery";
import type { StoreDiagnostic } from "./store";

/**
 * Appel modèle protégé financièrement — SEUL chemin autorisé vers Anthropic.
 *
 * Ordre imposé :
 *   0. temps restant ≥ 53 s, sinon refus (ni comptage, ni réservation) ;
 *   1. comptage des tokens de la requête exacte (gratuit, ≤ 5 s) ;
 *   2. refus si comptage × 1,05 > 30 000 — aucune réservation, aucun coût ;
 *   3. temps restant ≥ RESERVE + appel + SETTLE (48 s), sinon refus ;
 *   4. réservation atomique de 0,2475 $ (vérifie aussi la place vivante) ;
 *   5. appel du modèle (≤ 45 s, SDK sans retry) ;
 *   6. au plus UN retry applicatif (429 avec retry-after, 500, 529) s'il tient
 *      dans le temps restant ;
 *   7. règlement au coût réel, restitution, ou conservation de la réservation.
 *
 * L'échéance est une valeur ABSOLUE (`deadlineAt`) fixée une seule fois par la
 * route : aucun chemin de ce module ne la recalcule ni ne la prolonge.
 */

/** Issue d'une tentative d'appel, classée par la couche fournisseur. */
export type ModelAttempt<T> =
  | { kind: "success"; value: T; usage: unknown; anthropicRequestId?: string }
  /** Réponse HTTP d'erreur reçue d'Anthropic (non facturée). */
  | {
      kind: "http_error";
      status: number;
      retryAfterMs?: number;
      /** Plafond de dépense explicitement signalé par Anthropic. */
      spendLimit?: boolean;
      anthropicRequestId?: string;
    }
  /** Délai dépassé, annulation, coupure réseau, exception : facturation possible. */
  | { kind: "interrupted"; cause: "timeout" | "aborted" | "network" | "exception" };

/** Options transmises au fournisseur pour une opération bornée. */
export interface CallOptions {
  signal: AbortSignal;
  timeoutMs: number;
}

export type GuardedRefusal = "deadline" | "aborted" | "count_error" | "input_cap" | ReserveRefusal;

export interface UsageSummary {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type GuardedResult<T> =
  | {
      status: "ok";
      value: T;
      costNano: number;
      usage: UsageSummary;
      countedTokens: number;
      attempts: number;
      alerts: FinanceAlert[];
      /** Le règlement a échoué : la réservation reste comptée en entier. */
      settleFailed: boolean;
      killSet: boolean;
      overCost: boolean;
      countDrift: boolean;
      anthropicRequestId?: string;
    }
  | { status: "refused"; reason: GuardedRefusal; modelCalled: false; countedTokens?: number }
  | {
      status: "failed";
      reason: "http_error" | "rate_limited" | "spend_limit" | "interrupted" | "usage_missing";
      /** Vrai si la réservation a été rendue (erreur non facturée). */
      refunded: boolean;
      modelCalled: true;
      attempts: number;
      httpStatus?: number;
      cause?: string;
      paused?: boolean;
      killed?: boolean;
      anthropicRequestId?: string;
    };

export type FinanceEvent =
  | { type: "alert"; alert: FinanceAlert }
  | { type: "kill"; reason: string }
  | { type: "pause"; reason: string }
  /** Kill lu (lecture seule) après un règlement rejoué : posé par une tentative antérieure. */
  | { type: "kill_observed"; callId: string; reason: string }
  | { type: "settle_failed"; callId: string; attempt?: number; reason?: string; diag?: StoreDiagnostic; deferred?: boolean }
  | { type: "settle_retry"; callId: string; attempt: number; delayMs: number }
  | { type: "settled"; callId: string; attempt: number; outcome: "settled" | "replay"; deferred?: boolean }
  | { type: "settle_deferred"; callId: string }
  /** Règlement définitivement impossible : la réservation reste comptée ; coût réel à reporter. */
  | { type: "settle_abandoned"; callId: string; attempt: number; reason: string; costNano: number; amountNano: number }
  | { type: "reserve_failed"; callId: string; diag?: StoreDiagnostic }
  /** RESERVE rejoué dès la 1re tentative : état antérieur inattendu, aucune annulation. */
  | { type: "reserve_duplicate"; callId: string }
  | { type: "cancel_failed"; callId: string; attempt: number; reason?: string; diag?: StoreDiagnostic; deferred: boolean }
  /** CANCEL non abouti en 250 ms : refus rendu, CANCEL poursuivi (après la réponse si `deferred`). */
  | { type: "cancel_pending"; callId: string; waitMs: number; deferred: boolean }
  | { type: "cancelled"; callId: string; attempt: number; outcome: "tombstoned" | "refunded" | "replay"; refundedNano: number; deferred: boolean }
  /** Réservation incertaine non annulée : aucun appel n'a eu lieu ; montant possiblement bloqué. */
  | { type: "reserve_uncertain"; callId: string; attempt: number; amountNano: number; deferred: boolean }
  | { type: "throttle_record_failed"; callId: string };

export interface GuardedCallInput<T> {
  circuit: FinanceCircuit;
  visitor: string;
  requestId: string;
  callId: string;
  /** Échéance absolue de la requête (ms depuis l'époque Unix). */
  deadlineAt: number;
  now: () => number;
  /** Annulation externe (client déconnecté, flux annulé). */
  signal: AbortSignal;
  countTokens: (options: CallOptions) => Promise<number>;
  callModel: (options: CallOptions) => Promise<ModelAttempt<T>>;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  onEvent?: (event: FinanceEvent) => void;
  /**
   * Poursuite après la réponse (production : `after()`) d'une opération déjà
   * engagée : SETTLE, ou CANCEL d'un RESERVE incertain. Jamais de RESERVE ni
   * d'appel modèle. Absente : SETTLE non repris (état prudent) ; CANCEL
   * poursuivi au mieux (promesse détachée).
   */
  defer?: Defer;
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

type Bounded<V> =
  | { kind: "ok"; value: V }
  | { kind: "timeout" }
  | { kind: "aborted" }
  | { kind: "error" };

/**
 * Exécute une opération avec un délai strict et l'annulation externe.
 * Le signal transmis est annulé à l'échéance ; même si l'opération l'ignore,
 * l'attente s'arrête (course), de sorte que l'appelant n'est jamais bloqué.
 */
async function bounded<V>(
  operation: (options: CallOptions) => Promise<V>,
  timeoutMs: number,
  external: AbortSignal
): Promise<Bounded<V>> {
  if (external.aborted) return { kind: "aborted" };
  const controller = new AbortController();
  let timedOut = false;
  let stop: (outcome: Bounded<V>) => void = () => {};
  const stopped = new Promise<Bounded<V>>((resolve) => (stop = resolve));
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    stop({ kind: "timeout" });
  }, timeoutMs);
  const onAbort = () => {
    controller.abort();
    stop({ kind: "aborted" });
  };
  external.addEventListener("abort", onAbort, { once: true });

  try {
    const run = (async (): Promise<Bounded<V>> => {
      try {
        return { kind: "ok", value: await operation({ signal: controller.signal, timeoutMs }) };
      } catch {
        if (timedOut) return { kind: "timeout" };
        if (external.aborted) return { kind: "aborted" };
        return { kind: "error" };
      }
    })();
    return await Promise.race([run, stopped]);
  } finally {
    clearTimeout(timer);
    external.removeEventListener("abort", onAbort);
  }
}

/** Délai du retry applicatif autorisé pour cette réponse, ou null. */
function retryDelay(attempt: { status: number; retryAfterMs?: number; spendLimit?: boolean }): number | null {
  if (attempt.spendLimit) return null;
  if (attempt.status === 429) {
    // Sans retry-after : aucun retry (pause globale gérée au règlement).
    return attempt.retryAfterMs !== undefined ? attempt.retryAfterMs : null;
  }
  if (attempt.status === 500 || attempt.status === 529) {
    return attempt.retryAfterMs ?? APP_RETRY_DELAY_MS;
  }
  return null;
}

function summarize(usage: ModelUsage): UsageSummary {
  const n = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);
  return {
    inputTokens: n(usage.input_tokens),
    outputTokens: n(usage.output_tokens),
    cacheReadTokens: n(usage.cache_read_input_tokens),
    cacheWriteTokens: n(usage.cache_creation_input_tokens),
  };
}

export async function runGuardedModelCall<T>(input: GuardedCallInput<T>): Promise<GuardedResult<T>> {
  const { circuit, visitor, requestId, callId, deadlineAt, now, signal, onEvent } = input;
  const sleep = input.sleep ?? abortableSleep;
  const remainingMs = () => deadlineAt - now();

  // 0. Budget temporel du tour
  if (signal.aborted) return { status: "refused", reason: "aborted", modelCalled: false };
  if (remainingMs() < TURN_BUDGET_MS) return { status: "refused", reason: "deadline", modelCalled: false };

  // 1. Comptage
  const countTimeout = Math.min(COUNT_TOKENS_TIMEOUT_MS, remainingMs() - (REDIS_TIMEOUT_MS + MODEL_CALL_TIMEOUT_MS + REDIS_TIMEOUT_MS));
  if (countTimeout <= 0) return { status: "refused", reason: "deadline", modelCalled: false };
  const counting = await bounded(input.countTokens, countTimeout, signal);
  if (counting.kind === "aborted") return { status: "refused", reason: "aborted", modelCalled: false };
  if (counting.kind !== "ok") return { status: "refused", reason: "count_error", modelCalled: false };
  const counted = counting.value;
  if (!Number.isSafeInteger(counted) || counted < 0) {
    return { status: "refused", reason: "count_error", modelCalled: false };
  }

  // 2. Plafond d'entrée
  if (exceedsInputCap(counted)) {
    return { status: "refused", reason: "input_cap", modelCalled: false, countedTokens: counted };
  }

  // 3. Temps nécessaire à RESERVE + appel complet + SETTLE
  if (remainingMs() < REDIS_TIMEOUT_MS + MODEL_CALL_TIMEOUT_MS + REDIS_TIMEOUT_MS) {
    return { status: "refused", reason: "deadline", modelCalled: false, countedTokens: counted };
  }
  if (signal.aborted) return { status: "refused", reason: "aborted", modelCalled: false };

  // Pause de relance : jamais interrompue par l'annulation de la requête.
  const backoff = (ms: number) => sleep(ms, new AbortController().signal);
  const canRetryInTime = () => remainingMs() >= STORE_RETRY_BACKOFF_MS + REDIS_TIMEOUT_MS;

  // 4. Réservation (place vivante vérifiée atomiquement)
  const reserved = await circuit.reserve({ callId, requestId, visitor, nowMs: now() });
  if (!reserved.allowed) {
    // Issue inconnue (Redis a pu l'appliquer) : aucun appel n'aura lieu pour
    // ce callId, la réservation éventuelle est donc annulée — jamais réglée.
    if (reserved.reason === "store_unavailable" && reserved.pending) {
      onEvent?.({ type: "reserve_failed", callId, diag: reserved.diag });
      await cancelUncertain(reserved.pending);
    }
    // État préexistant à notre 1re tentative : alerte seulement, jamais de
    // CANCEL (la réservation n'est pas prouvée comme la nôtre), jamais d'appel.
    if (reserved.reason === "duplicate_call") onEvent?.({ type: "reserve_duplicate", callId });
    return { status: "refused", reason: reserved.reason, modelCalled: false, countedTokens: counted };
  }
  const { reservation } = reserved;
  for (const alert of reserved.alerts) onEvent?.({ type: "alert", alert });

  /**
   * RESERVE incertain → CANCEL (architecture C) :
   *  1. la première tentative CANCEL part immédiatement (≤ 1 500 ms côté Redis) ;
   *  2. l'application l'attend 250 ms au plus : si elle aboutit, fin ;
   *  3. sinon `cancel_pending`, le refus est rendu sans attendre, et la même
   *     tentative se poursuit après la réponse (`after()`), suivie d'au plus
   *     deux relances bornées ; échec définitif → `reserve_uncertain`.
   * Toujours la même réservation (callId, requestId, montant, clés de
   * période) : le script est idempotent. La continuation n'a accès qu'à
   * `circuit.cancel` — ni RESERVE, ni SETTLE, ni fournisseur.
   * Un RESERVE tardif est neutralisé dans tous les ordres : par la pierre
   * tombale, par RELEASE (requête libérée) ou par l'expiration de la place.
   */
  async function cancelUncertain(pending: Reservation) {
    const retryable = (r: CancelDecision) => !r.ok && r.reason === "store_unavailable";
    const failed = (r: CancelDecision, attempt: number, deferred: boolean) =>
      onEvent?.({ type: "cancel_failed", callId, attempt, reason: r.ok ? undefined : r.reason, diag: r.ok ? undefined : r.diag, deferred });
    const done = (r: CancelDecision, attempt: number, deferred: boolean) => {
      if (r.ok) onEvent?.({ type: "cancelled", callId, attempt, outcome: r.outcome, refundedNano: r.refundedNano, deferred });
    };
    const uncertain = (attempt: number, deferred: boolean) =>
      onEvent?.({ type: "reserve_uncertain", callId, attempt, amountNano: pending.amountNano, deferred });

    const first = circuit.cancel(pending);
    const early = await settleWithin(first, CANCEL_SYNC_WAIT_MS);
    if (early?.ok) {
      done(early, 1, false);
      return;
    }
    if (early) {
      failed(early, 1, false);
      if (!retryable(early)) {
        // Identité incohérente : jamais de remboursement aveugle.
        uncertain(1, false);
        return;
      }
    }

    const continuation = async () => {
      try {
        if (!early) {
          const result = await first;
          if (result.ok) {
            done(result, 1, true);
            return;
          }
          failed(result, 1, true);
          if (!retryable(result)) {
            uncertain(1, true);
            return;
          }
        }
        await runDeferredAttempts({
          run: () => circuit.cancel(pending),
          retryable,
          now,
          notAfter: deadlineAt + DEFERRED_RECOVERY_WINDOW_MS,
          sleep: backoff,
          firstAttempt: 2,
          onFailed: (r, attempt) => failed(r, attempt, true),
          onDone: (r, attempt) => done(r, attempt, true),
          onAbandoned: (attempt) => uncertain(attempt, true),
        });
      } catch {
        uncertain(1, true);
      }
    };

    // `after()` si disponible ; sinon poursuite au mieux (promesse détachée,
    // sans exception possible). `cancel_pending` est émis AVANT le refus :
    // une continuation interrompue reste repérable (pending sans issue).
    let viaAfter = false;
    if (input.defer) {
      try {
        input.defer(continuation);
        viaAfter = true;
      } catch {
        viaAfter = false;
      }
    }
    onEvent?.({ type: "cancel_pending", callId, waitMs: CANCEL_SYNC_WAIT_MS, deferred: viaAfter });
    if (!viaAfter) void continuation();
  }

  /**
   * SETTLE fiable : même callId, même réservation, mêmes montants à chaque
   * tentative ; une relance après 250 ms si elle tient avant l'échéance ;
   * sinon reprise différée (SETTLE uniquement). Un rejeu lit le kill pour
   * l'observabilité seulement.
   */
  async function settleReliably(settleInput: SettleInput): Promise<SettleDecision> {
    const retryable = (r: SettleDecision) => !r.ok && r.reason === "store_unavailable";
    const { result, attempt } = await reconcileWithRetry({
      run: () => circuit.settle(settleInput),
      retryable,
      canRetry: canRetryInTime,
      sleep: backoff,
      onFailed: (r, n) => onEvent?.({ type: "settle_failed", callId, attempt: n, reason: r.ok ? undefined : r.reason, diag: r.ok ? undefined : r.diag }),
      onRetry: (n, delayMs) => onEvent?.({ type: "settle_retry", callId, attempt: n, delayMs }),
    });
    if (result.ok) {
      if (attempt > 1) onEvent?.({ type: "settled", callId, attempt, outcome: result.outcome });
      if (result.outcome === "replay") await observeKill();
      return result;
    }
    if (!retryable(result)) return result;
    const abandon = (n: number, reason: string) =>
      onEvent?.({ type: "settle_abandoned", callId, attempt: n, reason, costNano: settleInput.actualNano, amountNano: settleInput.reservation.amountNano });
    const scheduled = deferReconciliation(input.defer, {
      run: () => circuit.settle(settleInput),
      retryable,
      now,
      notAfter: deadlineAt + DEFERRED_RECOVERY_WINDOW_MS,
      sleep: (ms) => backoff(ms),
      firstAttempt: attempt + 1,
      onFailed: (r, n) => onEvent?.({ type: "settle_failed", callId, attempt: n, reason: r.ok ? undefined : r.reason, diag: r.ok ? undefined : r.diag, deferred: true }),
      onDone: (r, n) => {
        if (!r.ok) return;
        onEvent?.({ type: "settled", callId, attempt: n, outcome: r.outcome, deferred: true });
        if (r.outcome === "replay") void observeKill();
      },
      onAbandoned: (n, why) => abandon(n, why),
    });
    if (scheduled) onEvent?.({ type: "settle_deferred", callId });
    else abandon(attempt, "no_defer");
    return result;
  }

  async function observeKill() {
    const kill = await circuit.readKill();
    if (kill) onEvent?.({ type: "kill_observed", callId, reason: safeKillReason(kill) });
  }

  const refund = async (anomaly?: string) => {
    const settled = await settleReliably({
      reservation,
      actualNano: 0,
      countedTokens: 0,
      billedInputTokens: 0,
      anomaly,
    });
    if (anomaly) onEvent?.({ type: "kill", reason: anomaly });
    return settled.ok;
  };

  // Annulé entre la réservation et l'appel : rien n'a été envoyé, restitution.
  if (signal.aborted) {
    await refund();
    return { status: "refused", reason: "aborted", modelCalled: false, countedTokens: counted };
  }

  // 5. Appel (délai = min(45 s, restant − SETTLE))
  const attemptOnce = async (): Promise<ModelAttempt<T>> => {
    const timeout = Math.min(MODEL_CALL_TIMEOUT_MS, remainingMs() - REDIS_TIMEOUT_MS);
    if (timeout <= 0) return { kind: "interrupted", cause: "timeout" };
    const outcome = await bounded(input.callModel, timeout, signal);
    if (outcome.kind === "ok") return outcome.value;
    if (outcome.kind === "timeout") return { kind: "interrupted", cause: "timeout" };
    if (outcome.kind === "aborted") return { kind: "interrupted", cause: "aborted" };
    return { kind: "interrupted", cause: "exception" };
  };

  let attempts = 1;
  let attempt = await attemptOnce();

  // 6. Au plus un retry applicatif, seulement s'il tient dans le temps restant
  if (attempt.kind === "http_error") {
    const delay = retryDelay(attempt);
    if (
      delay !== null &&
      delay >= 0 &&
      delay + MODEL_CALL_TIMEOUT_MS + REDIS_TIMEOUT_MS + RETRY_SAFETY_MARGIN_MS <= remainingMs()
    ) {
      await sleep(delay, signal);
      if (!signal.aborted) {
        attempts = 2;
        attempt = await attemptOnce();
      }
    }
  }

  // 7. Règlement
  if (attempt.kind === "interrupted") {
    // Facturation possible : la réservation reste comptée, aucune restitution.
    return {
      status: "failed",
      reason: "interrupted",
      refunded: false,
      modelCalled: true,
      attempts,
      cause: attempt.cause,
    };
  }

  if (attempt.kind === "http_error") {
    const base = { modelCalled: true as const, attempts, httpStatus: attempt.status, anthropicRequestId: attempt.anthropicRequestId };
    if (attempt.spendLimit) {
      const refunded = await refund("plafond_depense_anthropic");
      return { status: "failed", reason: "spend_limit", refunded, killed: true, ...base };
    }
    if (attempt.status === 429 && attempt.retryAfterMs === undefined) {
      // 429 sans retry-after : restitution + pause globale (kill si persistant).
      const refunded = await refund();
      const throttle = await circuit.record429WithoutRetryAfter({ nowMs: now() });
      if (!throttle.ok) {
        onEvent?.({ type: "throttle_record_failed", callId });
        return { status: "failed", reason: "rate_limited", refunded, ...base };
      }
      if (throttle.killed) onEvent?.({ type: "kill", reason: "429_sans_retry_after_persistant" });
      else if (throttle.paused) onEvent?.({ type: "pause", reason: "429_sans_retry_after" });
      return {
        status: "failed",
        reason: "rate_limited",
        refunded,
        paused: throttle.paused,
        killed: throttle.killed,
        ...base,
      };
    }
    // Autre erreur HTTP d'Anthropic : non facturée, réservation rendue.
    const refunded = await refund();
    return { status: "failed", reason: "http_error", refunded, ...base };
  }

  if (!isUsableUsage(attempt.usage)) {
    // Coût inconnu : la réservation reste comptée en entier.
    return {
      status: "failed",
      reason: "usage_missing",
      refunded: false,
      modelCalled: true,
      attempts,
      anthropicRequestId: attempt.anthropicRequestId,
    };
  }

  const usage = attempt.usage as ModelUsage;
  const cost = actualCost(usage);
  const settled = await settleReliably({
    reservation,
    actualNano: cost.costNano,
    countedTokens: counted,
    billedInputTokens: cost.billedInputTokens,
    anomaly: cost.forbiddenUsage ? "usage_interdit" : undefined,
  });

  const common = {
    status: "ok" as const,
    value: attempt.value,
    costNano: cost.costNano,
    usage: summarize(usage),
    countedTokens: counted,
    attempts,
    anthropicRequestId: attempt.anthropicRequestId,
  };

  if (!settled.ok) {
    return { ...common, alerts: [], settleFailed: true, killSet: false, overCost: false, countDrift: false };
  }
  for (const alert of settled.alerts) onEvent?.({ type: "alert", alert });
  if (settled.killSet) {
    onEvent?.({
      type: "kill",
      reason: settled.overCost
        ? "cout_reel_superieur_reservation"
        : settled.countDrift
          ? "ecart_comptage_superieur_marge"
          : "usage_interdit",
    });
  }
  return {
    ...common,
    alerts: settled.alerts,
    settleFailed: false,
    killSet: settled.killSet,
    overCost: settled.overCost,
    countDrift: settled.countDrift,
  };
}
