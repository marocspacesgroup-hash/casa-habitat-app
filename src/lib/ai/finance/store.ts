import { Redis } from "@upstash/redis";
import { REDIS_RETRIES, REDIS_TIMEOUT_MS } from "./limits";

/**
 * Accès Redis minimal du circuit : exécuter un script atomique.
 *
 * Le circuit ne dépend que de cette interface — la production utilise
 * Upstash, les tests un Redis simulé qui exécute les mêmes scripts Lua.
 * Aucune implémentation en mémoire n'est prévue pour la production.
 */
export interface ScriptStore {
  /** `probe`, facultatif, reçoit le nombre de tentatives HTTP de CETTE opération. */
  evalScript(script: string, keys: string[], args: string[], probe?: OperationProbe): Promise<unknown>;
}

/** Compteur local à une opération : tentatives HTTP engagées par le SDK. */
export interface OperationProbe {
  httpAttempts: number;
}

/**
 * Classes d'erreur journalisables. Tout autre nom devient « Other » : le nom
 * d'une erreur inconnue n'est jamais recopié.
 */
const ERROR_CLASSES = new Set([
  "TimeoutError",
  "AbortError",
  "TypeError",
  "UpstashError",
  "UpstashJSONParseError",
  "SyntaxError",
  "FinanceStoreError",
]);

/** Codes réseau journalisables (ex. ECONNRESET, UND_ERR_CONNECT_TIMEOUT). */
const ERROR_CODE = /^[A-Z][A-Z0-9_]{2,31}$/;

/**
 * Diagnostic d'un échec du store, en liste blanche stricte : aucun message
 * d'erreur, aucune clé Redis, aucun argument de script, aucun secret. Le
 * message d'une UpstashError contient la commande complète : il n'est jamais lu.
 */
export interface StoreDiagnostic {
  /** "replayed" : RESERVE rejoué par la relance du SDK (tentative 1 appliquée, réponse perdue). */
  storeKind: "config" | "timeout" | "unavailable" | "bad_reply" | "replayed";
  errorClass: string;
  errorCode?: string;
  elapsedMs: number;
  timeoutMs: number;
  /** Tentatives HTTP engagées pour cette opération (mesure locale, absente si inconnue). */
  httpAttempts?: number;
  /** Temps écoulé depuis la fin de la précédente opération de cette instance (mesure locale). */
  idleBeforeMs?: number;
}

export class FinanceStoreError extends Error {
  constructor(
    readonly kind: "config" | "timeout" | "unavailable",
    message: string,
    readonly diag?: StoreDiagnostic
  ) {
    super(message);
    this.name = "FinanceStoreError";
  }
}

/** Nom de classe et code réseau d'une erreur, ramenés à la liste blanche. */
export function classifyStoreError(error: unknown): { errorClass: string; errorCode?: string } {
  const name = typeof error === "object" && error !== null ? String((error as { name?: unknown }).name ?? "") : "";
  const errorClass = ERROR_CLASSES.has(name) ? name : "Other";
  const causeCode = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  const ownCode = (error as { code?: unknown } | null)?.code;
  const code = typeof causeCode === "string" ? causeCode : typeof ownCode === "string" ? ownCode : undefined;
  return code && ERROR_CODE.test(code) ? { errorClass, errorCode: code } : { errorClass };
}

/**
 * Impose un délai TOTAL à une opération, retries du SDK compris.
 * Au-delà, l'opération est considérée comme échouée (fail-closed), même si
 * Redis finit par l'exécuter : une réservation appliquée tardivement reste
 * alors comptée sans appel associé, ce qui ne peut que réduire la dépense.
 */
export async function withDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new FinanceStoreError("timeout", `Redis n'a pas répondu en ${timeoutMs} ms`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Enveloppe un store : délai total, erreurs normalisées et diagnostic en liste blanche. */
export function guardedStore(inner: ScriptStore, timeoutMs = REDIS_TIMEOUT_MS): ScriptStore {
  let lastDoneAt: number | undefined;
  return {
    async evalScript(script, keys, args, callerProbe) {
      const startedAt = Date.now();
      const idleBeforeMs = lastDoneAt === undefined ? undefined : startedAt - lastDoneAt;
      const probe: OperationProbe = { httpAttempts: 0 };
      try {
        return await withDeadline(inner.evalScript(script, keys, args, probe), timeoutMs);
      } catch (error) {
        const kind = error instanceof FinanceStoreError ? error.kind : "unavailable";
        const diag: StoreDiagnostic = {
          storeKind: kind,
          ...classifyStoreError(error),
          elapsedMs: Date.now() - startedAt,
          timeoutMs,
          ...(probe.httpAttempts > 0 ? { httpAttempts: probe.httpAttempts } : {}),
          ...(idleBeforeMs === undefined ? {} : { idleBeforeMs }),
        };
        throw new FinanceStoreError(kind, kind === "timeout" ? `Redis n'a pas répondu en ${timeoutMs} ms` : "Redis indisponible", diag);
      } finally {
        lastDoneAt = Date.now();
        // Succès comme échec : l'appelant apprend combien de tentatives HTTP
        // l'opération a engagées (ex. un RESERVE rejoué par la relance du SDK).
        if (callerProbe) callerProbe.httpAttempts = probe.httpAttempts;
      }
    },
  };
}

/** Store dont chaque opération échoue : utilisé quand la configuration manque. */
function unconfiguredStore(missing: string[]): ScriptStore {
  return {
    async evalScript() {
      throw new FinanceStoreError("config", `Variables serveur manquantes : ${missing.join(", ")}`);
    },
  };
}

/**
 * Store Upstash construit à partir des variables SERVEUR :
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * Jamais préfixées NEXT_PUBLIC_, jamais journalisées.
 * Variable absente → chaque opération échoue → le circuit refuse tout (fail-closed).
 */
export function createUpstashStore(
  env: Record<string, string | undefined> = process.env
): ScriptStore {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const missing = [
    ...(url ? [] : ["UPSTASH_REDIS_REST_URL"]),
    ...(token ? [] : ["UPSTASH_REDIS_REST_TOKEN"]),
  ];
  if (missing.length > 0) return unconfiguredStore(missing);

  // Un client par opération : son compteur de tentatives HTTP lui est propre,
  // même quand plusieurs requêtes partagent l'instance. La connexion HTTP,
  // elle, reste mutualisée par le runtime (`fetch` global).
  const clientFor = (probe?: OperationProbe) =>
    new Redis({
      url,
      token,
      // Réponses brutes : le circuit interprète lui-même chaînes et entiers.
      automaticDeserialization: false,
      enableTelemetry: false,
      // Une requête HTTP par opération : aucune opération financière n'attend
      // qu'un lot se forme, et chacune reste bornée par son propre délai.
      enableAutoPipelining: false,
      // Un seul retry réseau, sans risque : chaque script est idempotent.
      // `backoff` n'est appelé qu'avant une nouvelle tentative : il la compte.
      retry: {
        retries: REDIS_RETRIES,
        backoff: () => {
          if (probe) probe.httpAttempts += 1;
          return 50;
        },
      },
      // Un seul signal par opération (le SDK l'évalue une fois, hors de sa
      // boucle de retry) ; le délai total est de plus imposé par guardedStore.
      signal: () => AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });

  return guardedStore({
    evalScript: (script, keys, args, probe) => {
      if (probe) probe.httpAttempts = 1;
      return clientFor(probe).eval(script, keys, args);
    },
  });
}
