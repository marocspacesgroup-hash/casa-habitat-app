import {
  RATE_LIMIT_CONCURRENT,
  RATE_LIMIT_PER_HOUR,
  RATE_LIMIT_PER_MINUTE,
} from "./config";

/**
 * Limitation de débit de /api/chat.
 *
 * CONTRAT :
 * - consume() compte une requête avant lecture du corps, comme auparavant.
 * - acquireSlot() réserve une place juste avant l'appel modèle.
 * - releaseSlot() libère exactement cette place, y compris sur annulation.
 * - Les fonctions sont asynchrones car le stockage partagé est distant.
 *
 * STOCKAGE :
 * Upstash Redis REST est utilisé quand les deux variables serveur sont
 * présentes. Les décisions qui dépendent d'une lecture puis d'une écriture
 * sont exécutées dans Lua via EVAL afin de rester atomiques entre instances
 * serverless.
 *
 * SECOURS :
 * Si Upstash n'est pas configuré ou devient momentanément indisponible,
 * un compteur mémoire local est utilisé. Cela préserve la disponibilité du
 * conseiller, mais ne constitue pas une protection distribuée : ce mode est
 * explicitement limité à l'instance Vercel courante.
 */

interface Visitor {
  hits: number[];
  active: number;
}

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const FALLBACK_ACTIVE_TTL_MS = 60_000;
const SWEEP_THRESHOLD = 5000;

const visitors = new Map<string, Visitor>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, "");
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const UPSTASH_ENABLED = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const CONSUME_SCRIPT = `
local hour = tonumber(redis.call("GET", KEYS[1]) or "0")
local minute = tonumber(redis.call("GET", KEYS[2]) or "0")
local hour_limit = tonumber(ARGV[1])
local minute_limit = tonumber(ARGV[2])

if hour >= hour_limit then
  return {0, math.max(1, redis.call("TTL", KEYS[1])), 2}
end

if minute >= minute_limit then
  return {0, math.max(1, redis.call("TTL", KEYS[2])), 1}
end

local next_hour = redis.call("INCR", KEYS[1])
if next_hour == 1 then redis.call("EXPIRE", KEYS[1], 3600) end

local next_minute = redis.call("INCR", KEYS[2])
if next_minute == 1 then redis.call("EXPIRE", KEYS[2], 60) end

return {1, 0, 0}
`;

const ACQUIRE_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])

if current >= limit then
  return {0, 2}
end

local next_value = redis.call("INCR", KEYS[1])
redis.call("EXPIRE", KEYS[1], 60)
return {1, next_value}
`;

const RELEASE_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
if current <= 1 then
  redis.call("DEL", KEYS[1])
  return 0
end
return redis.call("DECR", KEYS[1])
`;

type RedisScriptResult = number[] | string[] | null;

async function redisEval(
  script: string,
  keys: string[],
  args: Array<string | number>
): Promise<RedisScriptResult> {
  if (!UPSTASH_ENABLED) return null;

  const response = await fetch(UPSTASH_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", script, String(keys.length), ...keys, ...args]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error(payload.error);

  return Array.isArray(payload.result) ? (payload.result as RedisScriptResult) : null;
}

/**
 * Le même hash tag {visitor} garantit que les clés d'un visiteur restent
 * dans le même slot Redis si le stockage évolue vers une topologie cluster.
 */
function redisKeys(key: string) {
  const safe = encodeURIComponent(key);
  return {
    hour: `casa:ai:rl:{${safe}}:hour`,
    minute: `casa:ai:rl:{${safe}}:minute`,
    active: `casa:ai:rl:{${safe}}:active`,
  };
}

export function visitorKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "sans-adresse";
}

function visitor(key: string): Visitor {
  let entry = visitors.get(key);
  if (!entry) {
    entry = { hits: [], active: 0 };
    visitors.set(key, entry);
  }
  return entry;
}

function sweep(now: number) {
  for (const [key, entry] of visitors) {
    const recent = entry.hits.length > 0 && now - entry.hits[entry.hits.length - 1] < HOUR_MS;
    if (!recent && entry.active === 0) visitors.delete(key);
  }
}

function secondsUntilFree(timestamp: number, windowMs: number, now: number): number {
  return Math.max(1, Math.ceil((timestamp + windowMs - now) / 1000));
}

function fallbackConsume(key: string): RateDecision {
  const now = Date.now();
  if (visitors.size > SWEEP_THRESHOLD) sweep(now);

  const entry = visitor(key);
  while (entry.hits.length > 0 && now - entry.hits[0] >= HOUR_MS) entry.hits.shift();

  if (entry.hits.length >= RATE_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      reason: "heure",
      retryAfterSeconds: secondsUntilFree(entry.hits[0], HOUR_LIMIT_MS, now),
    };
  }

  const minuteStart = now - MINUTE_MS;
  const firstInMinute = entry.hits.find((t) => t > minuteStart);
  const inMinute =
    firstInMinute === undefined ? 0 : entry.hits.length - entry.hits.indexOf(firstInMinute);

  if (inMinute >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      reason: "minute",
      retryAfterSeconds: secondsUntilFree(firstInMinute!, MINUTE_MS, now),
    };
  }

  entry.hits.push(now);
  return { allowed: true };
}

const HOUR_LIMIT_MS = HOUR_MS;

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: "minute" | "heure" | "concurrence";
}

export async function consume(key: string): Promise<RateDecision> {
  if (!UPSTASH_ENABLED) return fallbackConsume(key);

  try {
    const keys = redisKeys(key);
    const result = await redisEval(CONSUME_SCRIPT, [keys.hour, keys.minute], [
      RATE_LIMIT_PER_HOUR,
      RATE_LIMIT_PER_MINUTE,
    ]);

    if (!result || result.length < 3) throw new Error("Invalid Upstash consume response");

    const allowed = Number(result[0]) === 1;
    if (allowed) return { allowed: true };

    const retryAfterSeconds = Math.max(1, Number(result[1]) || 1);
    const reason = Number(result[2]) === 2 ? "heure" : "minute";
    return { allowed: false, reason, retryAfterSeconds };
  } catch {
    // Disponibilité prioritaire : on conserve le comportement de secours,
    // sans jamais exposer l'erreur Redis au visiteur.
    return fallbackConsume(key);
  }
}

function fallbackAcquire(key: string): RateDecision {
  const entry = visitor(key);
  if (entry.active >= RATE_LIMIT_CONCURRENT) {
    return { allowed: false, reason: "concurrence", retryAfterSeconds: 2 };
  }
  entry.active += 1;
  return { allowed: true };
}

export async function acquireSlot(key: string): Promise<RateDecision> {
  if (!UPSTASH_ENABLED) return fallbackAcquire(key);

  try {
    const result = await redisEval(ACQUIRE_SCRIPT, [redisKeys(key).active], [
      RATE_LIMIT_CONCURRENT,
    ]);

    if (!result || result.length < 2) throw new Error("Invalid Upstash acquire response");

    if (Number(result[0]) === 1) return { allowed: true };
    return { allowed: false, reason: "concurrence", retryAfterSeconds: Number(result[1]) || 2 };
  } catch {
    return fallbackAcquire(key);
  }
}

function fallbackRelease(key: string) {
  const entry = visitors.get(key);
  if (entry && entry.active > 0) entry.active -= 1;
}

export async function releaseSlot(key: string): Promise<void> {
  if (!UPSTASH_ENABLED) {
    fallbackRelease(key);
    return;
  }

  try {
    await redisEval(RELEASE_SCRIPT, [redisKeys(key).active], []);
  } catch {
    // Rien à faire côté visiteur : le TTL Redis évite qu'une réservation
    // oubliée reste bloquée indéfiniment.
  }
}
