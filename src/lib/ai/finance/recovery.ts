import {
  DEFERRED_RECOVERY_DELAYS_MS,
  REDIS_TIMEOUT_MS,
  STORE_OPERATION_MAX_RETRIES,
  STORE_RETRY_BACKOFF_MS,
} from "./limits";
import type { StoreDiagnostic } from "./store";

/**
 * Réconciliation fiable des opérations financières DÉJÀ ENGAGÉES.
 *
 * Seules trois opérations passent par ici : SETTLE et RELEASE (après un appel
 * ou une requête), CANCEL (après un RESERVE sans réponse exploitable, avant
 * tout appel). Aucune ne réserve, aucune n'appelle le modèle : ce module ne
 * reçoit d'ailleurs ni fournisseur ni fonction de réservation.
 *
 * Chaque script est idempotent vis-à-vis de son identifiant : une tentative
 * appliquée par Redis malgré un timeout côté client fait répondre `replay`
 * (ou retirer 0 place) à la suivante. Relancer ne compte donc jamais deux fois.
 */

/** Programme une tâche après la réponse (production : `after()` de Next.js). */
export type Defer = (task: () => Promise<void>) => void;

export interface ReconcileOutcome {
  ok: boolean;
  reason?: string;
  diag?: StoreDiagnostic;
}

/** Pause qui ne dépend pas de l'annulation de la requête : une réconciliation va à son terme. */
export function plainSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute une opération, puis au plus UNE relance après 250 ms si l'échec est
 * récupérable et si la relance tient encore (`canRetry`).
 */
export async function reconcileWithRetry<R extends ReconcileOutcome>(params: {
  run: () => Promise<R>;
  retryable: (result: R) => boolean;
  canRetry: () => boolean;
  sleep: (ms: number) => Promise<void>;
  onFailed: (result: R, attempt: number) => void;
  onRetry: (attempt: number, delayMs: number) => void;
}): Promise<{ result: R; attempt: number }> {
  let attempt = 1;
  for (;;) {
    const result = await params.run();
    if (result.ok) return { result, attempt };
    params.onFailed(result, attempt);
    if (attempt > STORE_OPERATION_MAX_RETRIES || !params.retryable(result) || !params.canRetry()) {
      return { result, attempt };
    }
    attempt += 1;
    params.onRetry(attempt, STORE_RETRY_BACKOFF_MS);
    await params.sleep(STORE_RETRY_BACKOFF_MS);
  }
}

/**
 * Reprise différée (après la réponse) d'une opération déjà engagée : deux
 * tentatives au plus, 1 s puis 3 s plus tard, chacune seulement si elle se
 * termine avant `notAfter` (durée maximale de la fonction, marge déduite).
 *
 * Renvoie false si aucune reprise n'a pu être programmée (pas de `defer`, ou
 * `defer` hors contexte de requête) : l'état reste alors le plus prudent
 * (réservation comptée en entier, place libérée par expiration).
 * La tâche ne lève jamais d'exception.
 */
export interface DeferredAttempts<R extends ReconcileOutcome> {
  run: () => Promise<R>;
  retryable: (result: R) => boolean;
  now: () => number;
  notAfter: number;
  sleep: (ms: number) => Promise<void>;
  firstAttempt: number;
  onFailed: (result: R, attempt: number) => void;
  onDone: (result: R, attempt: number) => void;
  onAbandoned: (attempt: number, why: "window" | "not_retryable" | "exhausted" | "exception") => void;
}

/** Tentatives différées bornées (1 s puis 3 s). Ne lève jamais. */
export async function runDeferredAttempts<R extends ReconcileOutcome>(params: DeferredAttempts<R>): Promise<void> {
  let attempt = params.firstAttempt;
  try {
    for (const delay of DEFERRED_RECOVERY_DELAYS_MS) {
      await params.sleep(delay);
      if (params.now() + REDIS_TIMEOUT_MS > params.notAfter) {
        params.onAbandoned(attempt, "window");
        return;
      }
      const result = await params.run();
      if (result.ok) {
        params.onDone(result, attempt);
        return;
      }
      params.onFailed(result, attempt);
      if (!params.retryable(result)) {
        params.onAbandoned(attempt, "not_retryable");
        return;
      }
      attempt += 1;
    }
    params.onAbandoned(attempt - 1, "exhausted");
  } catch {
    params.onAbandoned(attempt, "exception");
  }
}

export function deferReconciliation<R extends ReconcileOutcome>(defer: Defer | undefined, params: DeferredAttempts<R>): boolean {
  if (!defer) return false;
  try {
    defer(() => runDeferredAttempts(params));
    return true;
  } catch {
    return false;
  }
}

/**
 * Attend `promise` au plus `ms` millisecondes (horloge réelle) ; undefined
 * au-delà. N'annule rien : l'opération continue et reste attendable. Il s'agit
 * d'une attente de l'application, sans effet sur le délai Redis de l'opération.
 */
export async function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const elapsed = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    return await Promise.race([promise, elapsed]);
  } finally {
    clearTimeout(timer);
  }
}

/** Champs de diagnostic journalisables (déjà en liste blanche). */
export function diagFields(diag: StoreDiagnostic | undefined): Record<string, string | number> {
  if (!diag) return {};
  return {
    storeKind: diag.storeKind,
    errorClass: diag.errorClass,
    ...(diag.errorCode ? { errorCode: diag.errorCode } : {}),
    elapsedMs: diag.elapsedMs,
    timeoutMs: diag.timeoutMs,
    ...(diag.httpAttempts !== undefined ? { httpAttempts: diag.httpAttempts } : {}),
    ...(diag.idleBeforeMs !== undefined ? { idleBeforeMs: diag.idleBeforeMs } : {}),
  };
}

/** Motif de kill lu dans Redis : codes internes uniquement, sinon « autre ». */
export function safeKillReason(value: string): string {
  return /^[a-z0-9_]{1,64}$/.test(value) ? value : "autre";
}
