import {
  RATE_LIMIT_CONCURRENT,
  RATE_LIMIT_PER_HOUR,
  RATE_LIMIT_PER_MINUTE,
} from "./config";

/**
 * Limitation de débit de /api/chat.
 *
 * PORTÉE RÉELLE — à lire avant toute conclusion sur la sécurité :
 * les compteurs ci-dessous vivent dans la mémoire du processus. Sur un
 * hébergement serverless, plusieurs instances peuvent servir le même
 * visiteur, et elles ne partagent pas cette mémoire : un attaquant réparti
 * sur N instances obtient N fois le quota. Ce module réduit l'abus, il ne
 * le supprime pas.
 *
 * Il est écrit ainsi faute de stockage partagé dans le projet : aucun client
 * KV, Redis ou Upstash n'est installé, aucune variable d'environnement n'en
 * désigne un, et la seule base disponible — Supabase — exigerait une table
 * de compteurs, création interdite dans ce périmètre. Plutôt que de simuler
 * une protection distribuée, le mécanisme est isolé ici : le jour où un
 * stockage partagé existera, seul ce fichier changera, sans toucher à la
 * route ni à l'agent.
 *
 * Ce qui, en revanche, protège quelle que soit l'instance : le plafond de
 * taille du corps et le nombre de réessais du SDK, tous deux appliqués par
 * requête et sans état.
 */

interface Visitor {
  /** Horodatages des requêtes retenues, les plus anciennes en tête. */
  hits: number[];
  /** Requêtes actuellement en cours de traitement pour ce visiteur. */
  active: number;
}

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const visitors = new Map<string, Visitor>();

/** Au-delà, on balaie la table pour qu'un flot d'IP distinctes ne la fasse pas croître sans fin. */
const SWEEP_THRESHOLD = 5000;

/**
 * Identifie le visiteur.
 *
 * Sur Vercel, `x-forwarded-for` est réécrit par la plateforme et sa première
 * entrée est l'adresse réelle du client : elle est fiable. Hors de ce cadre —
 * exécution locale, ou hébergement sans proxy de confiance — l'en-tête est
 * fourni par le client et donc falsifiable. C'est le compromis assumé : aucune
 * empreinte de navigateur n'est calculée, aucune donnée personnelle
 * supplémentaire n'est collectée, et l'adresse ne sert qu'à ce comptage.
 */
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

/** Supprime les visiteurs sans requête récente ni requête en cours. */
function sweep(now: number) {
  for (const [key, entry] of visitors) {
    const recent = entry.hits.length > 0 && now - entry.hits[entry.hits.length - 1] < HOUR_MS;
    if (!recent && entry.active === 0) visitors.delete(key);
  }
}

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
  /** Fenêtre ayant provoqué le refus — pour le journal de bord, jamais exposé au visiteur. */
  reason?: "minute" | "heure" | "concurrence";
}

/**
 * Décide si la requête peut être traitée, et enregistre le passage.
 *
 * Appelée avant toute lecture du corps et avant tout appel au modèle : une
 * requête refusée ne coûte ni analyse JSON, ni jeton Anthropic.
 */
export function consume(key: string): RateDecision {
  const now = Date.now();
  if (visitors.size > SWEEP_THRESHOLD) sweep(now);

  const entry = visitor(key);
  while (entry.hits.length > 0 && now - entry.hits[0] >= HOUR_MS) entry.hits.shift();

  const inHour = entry.hits.length;
  if (inHour >= RATE_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      reason: "heure",
      retryAfterSeconds: secondsUntilFree(entry.hits[0], HOUR_MS, now),
    };
  }

  const minuteStart = now - MINUTE_MS;
  const firstInMinute = entry.hits.find((t) => t > minuteStart);
  const inMinute = firstInMinute === undefined ? 0 : entry.hits.length - entry.hits.indexOf(firstInMinute);
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

function secondsUntilFree(oldest: number, window: number, now: number): number {
  return Math.max(1, Math.ceil((oldest + window - now) / 1000));
}

/**
 * Réserve une place de traitement simultané.
 * Séparée de `consume` pour que les requêtes rejetées plus loin — corps
 * invalide, message trop long — ne laissent jamais une place occupée.
 */
export function acquireSlot(key: string): RateDecision {
  const entry = visitor(key);
  if (entry.active >= RATE_LIMIT_CONCURRENT) {
    // Refus immédiat plutôt qu'une attente : le visiteur ne doit pas rester
    // suspendu jusqu'au délai de 45 secondes pour apprendre qu'il est en trop.
    return { allowed: false, reason: "concurrence", retryAfterSeconds: 2 };
  }
  entry.active += 1;
  return { allowed: true };
}

/** Libère la place. Toujours appelée, y compris si le flux est interrompu. */
export function releaseSlot(key: string) {
  const entry = visitors.get(key);
  if (entry && entry.active > 0) entry.active -= 1;
}
