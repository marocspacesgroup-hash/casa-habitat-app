/**
 * Limites verrouillées de l'agent IA (décisions P3.2 / P4.1 / P4.2-B).
 *
 * SOURCE UNIQUE DE VÉRITÉ : `config.ts`, l'agent, le fournisseur et la route
 * lisent ces constantes. Aucune n'est lue depuis l'environnement ou la requête :
 * les modifier exige une modification du code, relue et testée.
 *
 * Tous les montants sont en NANODOLLARS entiers (1 $ = 1 000 000 000 n$) :
 * aucun calcul financier ne passe par des nombres à virgule, et chaque valeur
 * reste très en deçà de 2^53, donc exacte en JavaScript comme en Lua.
 */

export const NANODOLLARS_PER_DOLLAR = 1_000_000_000;

// ─── Modèle ────────────────────────────────────────────────────────────────

/** Modèle unique autorisé. Aucune variable d'environnement ne peut le changer. */
export const MODEL_ID = "claude-opus-5";

/** Tours modèle maximum par message visiteur. */
export const MAX_TURNS_PER_MESSAGE = 3;

/** Tokens d'entrée maximum d'un appel, marge de comptage incluse. */
export const INPUT_CAP_TOKENS = 30_000;

/** Tokens de sortie maximum d'un appel (`max_tokens`, réflexion comprise). */
export const OUTPUT_CAP_TOKENS = 1_500;

/** Marge appliquée au comptage `count_tokens`, en pourcentage. */
export const COUNT_MARGIN_PERCENT = 5;

/**
 * Tarifs Claude Opus 5 × facteur de prudence 1,1, en nanodollars par token.
 * Base officielle (par million de tokens) : entrée 5 $, écriture cache 5 min
 * 6,25 $, écriture cache 1 h 10 $, lecture cache 0,50 $, sortie 25 $.
 * Le cache 1 h est interdit : son tarif ne sert qu'à chiffrer une violation.
 */
export const PRICE_NANO_PER_TOKEN = {
  input: 5_500,
  cacheWrite5m: 6_875,
  cacheWrite1h: 11_000,
  cacheRead: 550,
  output: 27_500,
} as const;

/**
 * Coût maximal réservé par appel :
 * I_cap × prix d'entrée le plus cher autorisé + O_cap × prix de sortie
 * = 30 000 × 6 875 + 1 500 × 27 500 = 247 500 000 n$ = 0,2475 $.
 */
export const RESERVATION_NANO =
  INPUT_CAP_TOKENS * PRICE_NANO_PER_TOKEN.cacheWrite5m +
  OUTPUT_CAP_TOKENS * PRICE_NANO_PER_TOKEN.output;

// ─── Budgets ───────────────────────────────────────────────────────────────

export const BUDGET_GLOBAL_DAY_NANO = 9 * NANODOLLARS_PER_DOLLAR;
export const BUDGET_GLOBAL_HOUR_NANO = 3_600_000_000;
export const BUDGET_VISITOR_DAY_NANO = 2 * NANODOLLARS_PER_DOLLAR;

/** Seuils d'alerte du budget journalier global (60 % et 80 %). */
export const ALERT_60_NANO = (BUDGET_GLOBAL_DAY_NANO * 60) / 100;
export const ALERT_80_NANO = (BUDGET_GLOBAL_DAY_NANO * 80) / 100;

// ─── Débit et concurrence ──────────────────────────────────────────────────

export const CONCURRENCY_GLOBAL_MAX = 8;
export const CONCURRENCY_VISITOR_MAX = 2;
export const RATE_VISITOR_PER_MINUTE = 5;
export const RATE_VISITOR_PER_HOUR = 30;

// ─── Requête HTTP ──────────────────────────────────────────────────────────

export const BODY_MAX_BYTES = 64 * 1024;
export const MESSAGE_MAX_CHARS = 1_500;
export const HISTORY_MAX_MESSAGES = 12;
export const HISTORY_MAX_CHARS = 6_000;

// ─── Outils ────────────────────────────────────────────────────────────────

export const TOOL_CALLS_PER_TURN_MAX = 3;
export const TOOL_CALLS_PER_REQUEST_MAX = 4;
export const RESULTS_PER_SEARCH_MAX = 5;
export const RESULTS_PER_REQUEST_MAX = 12;
export const TOOL_RESULT_MAX_BYTES = 6 * 1024;

// ─── Temps ─────────────────────────────────────────────────────────────────

/** Échéance globale d'une requête, mesurée depuis t0 (juste avant ADMIT). */
export const REQUEST_DEADLINE_MS = 210_000;

/** Durée maximale de la fonction Vercel (déclarée par la route). */
export const VERCEL_MAX_DURATION_SECONDS = 300;

export const BODY_READ_TIMEOUT_MS = 10_000;
export const COUNT_TOKENS_TIMEOUT_MS = 5_000;

/** Délai d'un appel Anthropic ; au-delà, l'appel est abandonné et sa réservation conservée. */
export const MODEL_CALL_TIMEOUT_MS = 45_000;

/** Temps maximal de l'ensemble des outils d'un même tour. */
export const TOOLS_TURN_TIMEOUT_MS = 15_000;

/** Délai TOTAL d'une opération Redis, retries compris. */
export const REDIS_TIMEOUT_MS = 1_500;

/** Retries réseau du SDK Redis, à l'intérieur du délai total (scripts idempotents). */
export const REDIS_RETRIES = 1;

/**
 * Relance d'une opération de réconciliation (SETTLE, RELEASE, CANCEL) après
 * une erreur récupérable du store : au plus UNE relance, après 250 ms.
 * Chaque tentative reste bornée par REDIS_TIMEOUT_MS ; aucune ne réserve ni
 * n'appelle le modèle. Les scripts sont idempotents : une première tentative
 * exécutée malgré le timeout fait répondre `replay` à la relance.
 */
export const STORE_RETRY_BACKOFF_MS = 250;
export const STORE_OPERATION_MAX_RETRIES = 1;

/**
 * Attente MAXIMALE de la première tentative CANCEL avant de rendre le refus
 * (RESERVE incertain). Au-delà, CANCEL se poursuit après la réponse. Attente
 * de l'application uniquement : le délai de l'opération Redis reste 1 500 ms.
 */
export const CANCEL_SYNC_WAIT_MS = 250;

/**
 * Reprise différée (après la réponse, via `after()`), réservée à SETTLE et
 * RELEASE déjà engagés : deux tentatives, 1 s puis 3 s après l'échec. Elle
 * n'a lieu que dans la fenêtre laissée par la durée maximale de la fonction
 * après l'échéance, marge de 10 s déduite : 300 − 210 − 10 = 80 s.
 */
export const DEFERRED_RECOVERY_DELAYS_MS = [1_000, 3_000] as const;
export const DEFERRED_RECOVERY_MARGIN_MS = 10_000;
export const DEFERRED_RECOVERY_WINDOW_MS =
  VERCEL_MAX_DURATION_SECONDS * 1_000 - REQUEST_DEADLINE_MS - DEFERRED_RECOVERY_MARGIN_MS;

/** Attente avant l'unique retry applicatif d'une réponse 500 / 529 sans `retry-after`. */
export const APP_RETRY_DELAY_MS = 1_000;

/**
 * Budget temporel d'un tour :
 * comptage 5 s + RESERVE 1,5 s + appel 45 s + SETTLE 1,5 s = 53 s.
 * Aucun tour ne démarre avec moins de temps restant.
 */
export const TURN_BUDGET_MS =
  COUNT_TOKENS_TIMEOUT_MS + REDIS_TIMEOUT_MS + MODEL_CALL_TIMEOUT_MS + REDIS_TIMEOUT_MS;

/**
 * En dessous de ce temps restant, le tour est FINAL (`tool_choice: none`) :
 * ce tour (53 s) + ses outils (15 s) + un tour de réponse (53 s) = 121 s.
 */
export const FINAL_TURN_THRESHOLD_MS = TURN_BUDGET_MS + TOOLS_TURN_TIMEOUT_MS + TURN_BUDGET_MS;

/**
 * Condition d'un retry applicatif : attente + appel complet + règlement
 * + marge ≤ temps restant. La marge est nulle : RELEASE s'exécute hors échéance.
 */
export const RETRY_SAFETY_MARGIN_MS = 0;

/** Marge tolérée entre les horloges de deux instances. */
export const CLOCK_SKEW_MARGIN_MS = 58_000;

/**
 * Durée de vie d'une place de concurrence.
 * Invariant : échéance (210 s) + RELEASE (1,5 s) + marge d'horloge (58 s)
 * = 269,5 s < 270 s. Une requête normale ne survit donc jamais à sa place ;
 * RESERVE vérifie en plus atomiquement que la place est vivante.
 */
export const CONCURRENCY_SLOT_TTL_MS = 270_000;

// ─── Pause sur 429 sans retry-after (décision D1) ──────────────────────────

/**
 * Chaque 429 sans `retry-after` est compté dans deux fenêtres fixes.
 * - Dès PAUSE_429_THRESHOLD occurrences dans la fenêtre courte : pause globale
 *   de PAUSE_429_DURATION_SECONDS (expiration automatique), alerte.
 * - Dès KILL_429_THRESHOLD occurrences dans la fenêtre longue : kill global
 *   (problème persistant, remise en service manuelle).
 * Un 429 n'étant pas facturé, aucune de ces valeurs n'a d'effet financier.
 */
export const PAUSE_429_THRESHOLD = 1;
export const PAUSE_429_WINDOW_SECONDS = 600;
export const PAUSE_429_DURATION_SECONDS = 300;
export const KILL_429_THRESHOLD = 3;
export const KILL_429_WINDOW_SECONDS = 3_600;

// ─── Durées de conservation Redis ──────────────────────────────────────────

/**
 * - jour : 48 h, plus que la journée UTC entière, même pour un règlement tardif ;
 * - heure : 2 h, plus que l'heure UTC entière ;
 * - fenêtre minute : 2 min ;
 * - état d'un appel (réservation) : 24 h ; passé ce délai, un règlement ne
 *   peut plus rien rendre et la réservation reste comptée (prudence) ;
 * - état d'une requête admise : 24 h (idempotence de l'admission).
 */
export const TTL_DAY_SECONDS = 48 * 3600;
export const TTL_HOUR_SECONDS = 2 * 3600;
export const TTL_MINUTE_SECONDS = 120;
export const TTL_CALL_SECONDS = 24 * 3600;
export const TTL_REQUEST_SECONDS = 24 * 3600;
