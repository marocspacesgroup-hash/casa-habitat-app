import { financeKeys, isSafeIdentifier, type FinanceEnvironment } from "./keys";
import {
  ALERT_60_NANO,
  ALERT_80_NANO,
  BUDGET_GLOBAL_DAY_NANO,
  BUDGET_GLOBAL_HOUR_NANO,
  BUDGET_VISITOR_DAY_NANO,
  CONCURRENCY_GLOBAL_MAX,
  CONCURRENCY_SLOT_TTL_MS,
  CONCURRENCY_VISITOR_MAX,
  COUNT_MARGIN_PERCENT,
  KILL_429_THRESHOLD,
  KILL_429_WINDOW_SECONDS,
  PAUSE_429_DURATION_SECONDS,
  PAUSE_429_THRESHOLD,
  PAUSE_429_WINDOW_SECONDS,
  RATE_VISITOR_PER_HOUR,
  RATE_VISITOR_PER_MINUTE,
  REDIS_TIMEOUT_MS,
  RESERVATION_NANO,
  TTL_CALL_SECONDS,
  TTL_DAY_SECONDS,
  TTL_HOUR_SECONDS,
  TTL_MINUTE_SECONDS,
  TTL_REQUEST_SECONDS,
} from "./limits";
import {
  ADMIT_SCRIPT,
  CANCEL_SCRIPT,
  RELEASE_SCRIPT,
  RESERVE_SCRIPT,
  SETTLE_SCRIPT,
  THROTTLE_429_SCRIPT,
} from "./scripts";
import { FinanceStoreError, type OperationProbe, type ScriptStore, type StoreDiagnostic } from "./store";

/**
 * Circuit financier : admission, réservation, règlement, libération, pause.
 *
 * PRINCIPE FAIL-CLOSED : toute erreur (Redis absent, lent, en panne, réponse
 * inattendue) se traduit par un REFUS. Aucun chemin de ce module ne renvoie
 * une autorisation sans que le script Redis correspondant l'ait accordée.
 *
 * États globaux : OUVERT (ni kill ni pause), EN PAUSE (clé `pause` avec
 * expiration), ARRÊTÉ (clé `kill` sans expiration, remise en service manuelle).
 */

export type AdmitRefusal =
  | "killed"
  | "paused"
  | "rate_minute"
  | "rate_hour"
  | "concurrency_visitor"
  | "concurrency_global"
  | "invalid_identifier"
  | "store_unavailable";

export type AdmitDecision = { allowed: true } | { allowed: false; reason: AdmitRefusal };

export type ReserveRefusal =
  | "killed"
  | "paused"
  | "slot_expired"
  | "budget_day"
  | "budget_hour"
  | "budget_visitor"
  | "duplicate_call"
  | "invalid_identifier"
  | "store_unavailable";

/** Réservation accordée : porte les clés de période exactes à régler plus tard. */
export interface Reservation {
  callId: string;
  requestId: string;
  visitor: string;
  amountNano: number;
  keys: { day: string; hour: string; visitor: string; alert60: string; alert80: string };
}

export type ReserveDecision =
  | { allowed: true; reservation: Reservation; alerts: FinanceAlert[] }
  | { allowed: false; reason: Exclude<ReserveRefusal, "store_unavailable"> }
  | {
      allowed: false;
      reason: "store_unavailable";
      diag?: StoreDiagnostic;
      /**
       * Réservation TENTÉE dont l'issue est inconnue (Redis a pu l'appliquer
       * malgré l'échec côté client). À annuler par `cancel` : aucun appel
       * modèle n'a lieu sans réservation confirmée.
       */
      pending?: Reservation;
    };

export type FinanceAlert = "budget_day_60" | "budget_day_80";

export interface SettleInput {
  reservation: Reservation;
  /** Coût réel en nanodollars ; 0 = restitution intégrale. */
  actualNano: number;
  /** Tokens comptés avant l'appel (0 si sans objet, ex. restitution). */
  countedTokens: number;
  /** Tokens d'entrée réellement facturés (0 si sans objet). */
  billedInputTokens: number;
  /** Anomalie détectée par l'application (ex. cache 1 h, plafond de dépense) : pose le kill. */
  anomaly?: string;
}

export type SettleDecision =
  | {
      ok: true;
      outcome: "settled" | "replay";
      overCost: boolean;
      countDrift: boolean;
      killSet: boolean;
      alerts: FinanceAlert[];
    }
  | {
      ok: false;
      reason: "unknown_reservation" | "key_mismatch" | "invalid_amount" | "cancelled_call" | "store_unavailable";
      diag?: StoreDiagnostic;
    };

export type ReleaseDecision =
  | { ok: true; slotsRemoved: number }
  | { ok: false; reason: "invalid_identifier" | "store_unavailable"; diag?: StoreDiagnostic };

export type CancelDecision =
  | { ok: true; outcome: "tombstoned" | "refunded" | "replay"; refundedNano: number }
  | { ok: false; reason: "key_mismatch" | "invalid_identifier" | "store_unavailable"; diag?: StoreDiagnostic };

export type Throttle429Decision =
  | { ok: true; paused: boolean; killed: boolean; shortCount: number; longCount: number }
  | { ok: false; reason: "store_unavailable" };

export interface FinanceCircuit {
  admit(input: { requestId: string; visitor: string; nowMs: number }): Promise<AdmitDecision>;
  release(input: { requestId: string; visitor: string }): Promise<boolean>;
  /** RELEASE avec le nombre de places retirées (0 = rejeu ou place expirée) et le diagnostic d'échec. */
  releaseDetailed(input: { requestId: string; visitor: string }): Promise<ReleaseDecision>;
  reserve(input: { callId: string; requestId: string; visitor: string; nowMs: number }): Promise<ReserveDecision>;
  settle(input: SettleInput): Promise<SettleDecision>;
  /** Annule un appel dont la réservation est incertaine et qui n'a PAS été envoyé au modèle. */
  cancel(reservation: Reservation): Promise<CancelDecision>;
  /** Lecture seule du kill global (observabilité après un rejeu) ; undefined si illisible. */
  readKill(): Promise<string | null | undefined>;
  record429WithoutRetryAfter(input: { nowMs: number }): Promise<Throttle429Decision>;
}

/** Réponse de script inattendue : le script a pu s'exécuter, l'issue est inconnue. */
class BadReplyError extends Error {
  constructor() {
    super("Réponse Redis inattendue");
    this.name = "BadReply";
  }
}

function asArray(reply: unknown): unknown[] {
  if (!Array.isArray(reply)) throw new BadReplyError();
  return reply;
}

/** Diagnostic d'un échec : celui du store, ou « réponse inattendue ». Jamais de message. */
function diagOf(error: unknown): StoreDiagnostic | undefined {
  if (error instanceof FinanceStoreError) return error.diag;
  if (error instanceof BadReplyError) return { storeKind: "bad_reply", errorClass: "BadReply", elapsedMs: 0, timeoutMs: 0 };
  return undefined;
}

function flag(value: unknown): boolean {
  return Number(value) === 1;
}

function alertsFrom(a60: unknown, a80: unknown): FinanceAlert[] {
  return [...(flag(a60) ? ["budget_day_60" as const] : []), ...(flag(a80) ? ["budget_day_80" as const] : [])];
}

const ADMIT_REFUSALS: ReadonlySet<string> = new Set([
  "killed",
  "paused",
  "rate_minute",
  "rate_hour",
  "concurrency_visitor",
  "concurrency_global",
]);

const RESERVE_REFUSALS: ReadonlySet<string> = new Set([
  "killed",
  "paused",
  "slot_expired",
  "budget_day",
  "budget_hour",
  "budget_visitor",
]);

/** Identifiant visiteur attendu : HMAC hexadécimal (voir visitor.ts). */
function isVisitorKey(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export function createFinanceCircuit(store: ScriptStore, env: FinanceEnvironment): FinanceCircuit {
  const keys = financeKeys(env);

  const releaseDetailed = async ({ requestId, visitor }: { requestId: string; visitor: string }): Promise<ReleaseDecision> => {
    if (!isSafeIdentifier(requestId) || !isVisitorKey(visitor)) return { ok: false, reason: "invalid_identifier" };
    try {
      const [status, removed] = asArray(
        await store.evalScript(
          RELEASE_SCRIPT,
          [keys.request(requestId), keys.concurrencyVisitor(visitor), keys.concurrencyGlobal],
          [requestId]
        )
      );
      if (status === "released") return { ok: true, slotsRemoved: Number(removed) || 0 };
      return { ok: false, reason: "store_unavailable", diag: { storeKind: "bad_reply", errorClass: "BadReply", elapsedMs: 0, timeoutMs: 0 } };
    } catch (error) {
      // La place sera libérée par expiration (TTL de concurrence) à défaut de relance.
      return { ok: false, reason: "store_unavailable", diag: diagOf(error) };
    }
  };

  return {
    async admit({ requestId, visitor, nowMs }) {
      if (!isSafeIdentifier(requestId) || !isVisitorKey(visitor)) {
        return { allowed: false, reason: "invalid_identifier" };
      }
      try {
        const [decision] = asArray(
          await store.evalScript(
            ADMIT_SCRIPT,
            [
              keys.kill,
              keys.request(requestId),
              keys.rateMinute(visitor, nowMs),
              keys.rateHour(visitor, nowMs),
              keys.concurrencyVisitor(visitor),
              keys.concurrencyGlobal,
              keys.pause,
            ],
            [
              requestId,
              String(nowMs),
              String(RATE_VISITOR_PER_MINUTE),
              String(RATE_VISITOR_PER_HOUR),
              String(CONCURRENCY_VISITOR_MAX),
              String(CONCURRENCY_GLOBAL_MAX),
              String(CONCURRENCY_SLOT_TTL_MS),
              String(TTL_MINUTE_SECONDS),
              String(TTL_HOUR_SECONDS),
              String(TTL_REQUEST_SECONDS),
              visitor,
            ]
          )
        );
        if (decision === "admitted") return { allowed: true };
        if (typeof decision === "string" && ADMIT_REFUSALS.has(decision)) {
          return { allowed: false, reason: decision as AdmitRefusal };
        }
        return { allowed: false, reason: "store_unavailable" };
      } catch {
        return { allowed: false, reason: "store_unavailable" };
      }
    },

    release: async (input) => (await releaseDetailed(input)).ok,

    releaseDetailed,

    async reserve({ callId, requestId, visitor, nowMs }) {
      if (!isSafeIdentifier(callId) || !isSafeIdentifier(requestId) || !isVisitorKey(visitor)) {
        return { allowed: false, reason: "invalid_identifier" };
      }
      const reservation: Reservation = {
        callId,
        requestId,
        visitor,
        amountNano: RESERVATION_NANO,
        keys: {
          day: keys.spendDay(nowMs),
          hour: keys.spendHour(nowMs),
          visitor: keys.spendVisitorDay(visitor, nowMs),
          alert60: keys.alert60(nowMs),
          alert80: keys.alert80(nowMs),
        },
      };
      const probe: OperationProbe = { httpAttempts: 0 };
      const startedAt = Date.now();
      try {
        const [decision, a60, a80] = asArray(
          await store.evalScript(
            RESERVE_SCRIPT,
            [
              keys.kill,
              keys.pause,
              keys.call(callId),
              reservation.keys.day,
              reservation.keys.hour,
              reservation.keys.visitor,
              reservation.keys.alert60,
              reservation.keys.alert80,
              keys.request(requestId),
              keys.concurrencyVisitor(visitor),
              keys.concurrencyGlobal,
            ],
            [
              callId,
              String(RESERVATION_NANO),
              String(BUDGET_GLOBAL_DAY_NANO),
              String(BUDGET_GLOBAL_HOUR_NANO),
              String(BUDGET_VISITOR_DAY_NANO),
              String(TTL_DAY_SECONDS),
              String(TTL_HOUR_SECONDS),
              String(TTL_CALL_SECONDS),
              String(ALERT_60_NANO),
              String(ALERT_80_NANO),
              requestId,
              String(nowMs),
              visitor,
            ],
            probe
          )
        );
        if (decision === "reserved") {
          return { allowed: true, reservation, alerts: alertsFrom(a60, a80) };
        }
        if (decision === "replay") {
          // Relance du SDK (≥ 2 tentatives HTTP) : la tentative 1 a été appliquée
          // puis sa réponse perdue. L'état existe par CETTE opération (le callId
          // est unique par tour) : réservation incertaine, à annuler.
          if (probe.httpAttempts >= 2) {
            return {
              allowed: false,
              reason: "store_unavailable",
              pending: reservation,
              diag: {
                storeKind: "replayed",
                errorClass: "ReserveReplay",
                elapsedMs: Date.now() - startedAt,
                timeoutMs: REDIS_TIMEOUT_MS,
                httpAttempts: probe.httpAttempts,
              },
            };
          }
          // État antérieur à notre 1re tentative : jamais annulé ici, jamais
          // de second appel (alerte `reserve_duplicate` côté appel protégé).
          return { allowed: false, reason: "duplicate_call" };
        }
        if (typeof decision === "string" && RESERVE_REFUSALS.has(decision)) {
          return { allowed: false, reason: decision as Exclude<ReserveRefusal, "store_unavailable"> };
        }
        // Réponse inattendue : le script a pu s'exécuter → réservation incertaine.
        return { allowed: false, reason: "store_unavailable", diag: diagOf(new BadReplyError()), pending: reservation };
      } catch (error) {
        // Échec côté client : Redis a pu appliquer la réservation → incertaine.
        return { allowed: false, reason: "store_unavailable", diag: diagOf(error), pending: reservation };
      }
    },

    async settle({ reservation, actualNano, countedTokens, billedInputTokens, anomaly }) {
      const valid = (n: number) => Number.isSafeInteger(n) && n >= 0;
      if (!valid(actualNano) || !valid(countedTokens) || !valid(billedInputTokens)) {
        return { ok: false, reason: "invalid_amount" };
      }
      try {
        const [decision, overCost, countDrift, killSet, a60, a80] = asArray(
          await store.evalScript(
            SETTLE_SCRIPT,
            [
              keys.kill,
              keys.call(reservation.callId),
              reservation.keys.day,
              reservation.keys.hour,
              reservation.keys.visitor,
              reservation.keys.alert60,
              reservation.keys.alert80,
            ],
            [
              String(actualNano),
              String(countedTokens),
              String(billedInputTokens),
              String(COUNT_MARGIN_PERCENT),
              String(TTL_DAY_SECONDS),
              String(ALERT_60_NANO),
              String(ALERT_80_NANO),
              anomaly ? "1" : "0",
              anomaly ?? "",
            ]
          )
        );
        if (decision === "settled" || decision === "replay") {
          return {
            ok: true,
            outcome: decision,
            overCost: flag(overCost),
            countDrift: flag(countDrift),
            killSet: flag(killSet),
            alerts: alertsFrom(a60, a80),
          };
        }
        if (decision === "unknown") return { ok: false, reason: "unknown_reservation" };
        if (decision === "key_mismatch") return { ok: false, reason: "key_mismatch" };
        if (decision === "cancelled") return { ok: false, reason: "cancelled_call" };
        return { ok: false, reason: "store_unavailable", diag: diagOf(new BadReplyError()) };
      } catch (error) {
        // Règlement impossible : la réservation reste comptée en entier (prudence).
        return { ok: false, reason: "store_unavailable", diag: diagOf(error) };
      }
    },

    async cancel(reservation) {
      const { callId, requestId, visitor } = reservation;
      if (!isSafeIdentifier(callId) || !isSafeIdentifier(requestId) || !isVisitorKey(visitor)) {
        return { ok: false, reason: "invalid_identifier" };
      }
      try {
        const [decision, amount] = asArray(
          await store.evalScript(
            CANCEL_SCRIPT,
            [keys.call(callId), reservation.keys.day, reservation.keys.hour, reservation.keys.visitor],
            [String(TTL_CALL_SECONDS), requestId, String(TTL_DAY_SECONDS)]
          )
        );
        if (decision === "tombstoned" || decision === "refunded" || decision === "replay") {
          return { ok: true, outcome: decision, refundedNano: Number(amount) || 0 };
        }
        if (decision === "key_mismatch") return { ok: false, reason: "key_mismatch" };
        return { ok: false, reason: "store_unavailable", diag: diagOf(new BadReplyError()) };
      } catch (error) {
        return { ok: false, reason: "store_unavailable", diag: diagOf(error) };
      }
    },

    async readKill() {
      try {
        const value = await store.evalScript("return redis.call('GET', KEYS[1])", [keys.kill], []);
        return typeof value === "string" ? value : null;
      } catch {
        return undefined;
      }
    },

    async record429WithoutRetryAfter({ nowMs }) {
      try {
        const [status, shortCount, longCount, paused, killed] = asArray(
          await store.evalScript(
            THROTTLE_429_SCRIPT,
            [
              keys.kill,
              keys.pause,
              keys.throttle429(PAUSE_429_WINDOW_SECONDS, nowMs),
              keys.throttle429(KILL_429_WINDOW_SECONDS, nowMs),
            ],
            [
              String(PAUSE_429_THRESHOLD),
              String(PAUSE_429_WINDOW_SECONDS),
              String(PAUSE_429_DURATION_SECONDS),
              String(KILL_429_THRESHOLD),
              String(KILL_429_WINDOW_SECONDS),
            ]
          )
        );
        if (status !== "recorded") return { ok: false, reason: "store_unavailable" };
        return {
          ok: true,
          paused: flag(paused),
          killed: flag(killed),
          shortCount: Number(shortCount),
          longCount: Number(longCount),
        };
      } catch {
        return { ok: false, reason: "store_unavailable" };
      }
    },
  };
}
