import { guardedStore, type ScriptStore } from "@/lib/ai/finance/store";
import type { FakeRedis } from "./fake-redis";

/**
 * Store de test à pannes programmées, branché sur un FakeRedis.
 *
 * Pour chaque script ciblé, les pannes sont consommées dans l'ordre :
 *  - "timeout_before" : ne répond jamais et n'exécute RIEN (requête perdue) ;
 *  - "timeout_after"  : exécute le script, puis ne répond jamais (réponse perdue) ;
 *  - "upstash"        : erreur HTTP d'Upstash dont le message contient la commande
 *                       (clés, identifiants) — ne doit jamais atteindre un journal ;
 *  - "network"        : erreur réseau (TypeError, cause ECONNRESET), rien d'exécuté ;
 *  - "bad_reply"      : exécute le script, puis renvoie une réponse inexploitable ;
 *  - "slow_after"     : répond normalement, mais après 400 ms (exécution à la réponse) ;
 *  - "mismatch_exec"  : altère le jour enregistré dans l'état de l'appel (KEYS[1]),
 *                       puis exécute : simule une identité incohérente ;
 *  - "applied_then_retry" : relance du SDK (R1) — tentative 1 exécutée, réponse perdue,
 *                       tentative 2 exécutée à nouveau (sonde : 2 tentatives) ;
 *  - "lost_then_retry"    : tentative 1 perdue AVANT exécution, tentative 2 exécutée
 *                       (sonde : 2 tentatives).
 * Enveloppé par `guardedStore` (délai court) : même chemin d'erreur qu'en production.
 */
export type Fault =
  | "timeout_before"
  | "timeout_after"
  | "upstash"
  | "network"
  | "bad_reply"
  | "slow_after"
  | "mismatch_exec"
  | "applied_then_retry"
  | "lost_then_retry";

export const SLOW_FAULT_MS = 400;

export function faultyStore(redis: FakeRedis, plan: Map<string, Fault[]>, timeoutMs = 30): ScriptStore {
  const inner: ScriptStore = {
    async evalScript(script, keys, args, probe) {
      const fault = plan.get(script)?.shift();
      if (fault === "applied_then_retry") {
        redis.eval(script, keys, args);
        if (probe) probe.httpAttempts = 2;
        return redis.eval(script, keys, args);
      }
      if (fault === "lost_then_retry") {
        if (probe) probe.httpAttempts = 2;
        return redis.eval(script, keys, args);
      }
      if (fault === "timeout_before") return new Promise(() => {});
      if (fault === "timeout_after") {
        redis.eval(script, keys, args);
        return new Promise(() => {});
      }
      if (fault === "upstash") {
        const error = new Error(`ERR interne, command was: ${JSON.stringify(["EVAL", "…", keys.length, ...keys, ...args])}`);
        error.name = "UpstashError";
        throw error;
      }
      if (fault === "network") {
        throw new TypeError("fetch failed", { cause: Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }) });
      }
      if (fault === "bad_reply") {
        redis.eval(script, keys, args);
        return "OK";
      }
      if (fault === "slow_after") {
        await new Promise((resolve) => setTimeout(resolve, SLOW_FAULT_MS));
        return redis.eval(script, keys, args);
      }
      if (fault === "mismatch_exec") {
        redis.eval("redis.call('HSET', KEYS[1], 'day', 'jour-incoherent') return 1", [keys[0]], []);
        return redis.eval(script, keys, args);
      }
      return redis.eval(script, keys, args);
    },
  };
  return guardedStore(inner, timeoutMs);
}
