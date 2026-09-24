import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Identifiant visiteur pour les compteurs financiers (décision D4).
 *
 * SOURCE DE L'ADRESSE : l'en-tête `x-forwarded-for`, dont Vercel réécrit la
 * valeur avec l'IP publique du client et « ne transmet pas les IP externes »
 * pour empêcher l'usurpation (vercel.com/docs/headers/request-headers).
 * Seule sa première entrée est lue ; `x-real-ip`, identique sur Vercel, sert
 * de repli. Hors de Vercel, ces en-têtes sont falsifiables : le budget global,
 * indépendant de toute IP, reste alors la borne.
 *
 * Aucune donnée du corps de la requête, aucun cookie, aucune empreinte de
 * navigateur n'interviennent ici.
 *
 * 1. Normalisation :
 *    - IPv4 : adresse complète ;
 *    - IPv6 : préfixe /64 (un abonné dispose en général d'un /64 entier) ;
 *    - IPv4 encapsulée dans IPv6 (::ffff:a.b.c.d) : traitée comme IPv4 ;
 *    - adresse absente ou invalide : compartiment partagé « inconnu ».
 * 2. Pseudonymisation : HMAC-SHA256(secret serveur, identité normalisée).
 *    Seul ce condensat est stocké dans Redis ; l'IP brute n'est jamais
 *    conservée ni journalisée. Sans le secret, le condensat ne permet pas de
 *    retrouver l'adresse par essai exhaustif des IPv4.
 */
export const UNKNOWN_VISITOR = "inconnu";

/** Variable SERVEUR contenant le secret HMAC. Jamais préfixée NEXT_PUBLIC_. */
export const VISITOR_HMAC_SECRET_ENV = "AI_VISITOR_HMAC_SECRET";

/** Longueur minimale du secret : en dessous, il est refusé (fail-closed). */
export const VISITOR_HMAC_SECRET_MIN_LENGTH = 32;

function stripDecorations(raw: string): string {
  let value = raw.trim();
  // [2001:db8::1]:443
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) value = bracketed[1];
  // 203.0.113.7:51234
  const v4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) value = v4WithPort[1];
  // Identifiant de zone (fe80::1%eth0)
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  return value;
}

/** Développe une IPv6 valide en 8 groupes hexadécimaux de 4 caractères. */
function expandIPv6(address: string): string[] | null {
  let text = address.toLowerCase();
  let tail: string[] = [];

  // Partie IPv4 finale éventuelle (::ffff:1.2.3.4, 64:ff9b::1.2.3.4…)
  const lastColon = text.lastIndexOf(":");
  const maybeV4 = text.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    if (isIP(maybeV4) !== 4) return null;
    const [a, b, c, d] = maybeV4.split(".").map(Number);
    tail = [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
    text = text.slice(0, lastColon + 1) + "0:0";
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;

  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (groups.length !== 8) return null;
  if (tail.length === 2) {
    groups[6] = tail[0];
    groups[7] = tail[1];
  }
  return groups.map((g) => g.padStart(4, "0"));
}

/** Normalise une adresse brute en identité réseau (avant HMAC). */
export function normalizeVisitorAddress(raw: string | null | undefined): string {
  if (!raw) return UNKNOWN_VISITOR;
  const value = stripDecorations(raw);
  const family = isIP(value);

  if (family === 4) return `v4:${value}`;

  if (family === 6) {
    const groups = expandIPv6(value);
    if (!groups) return UNKNOWN_VISITOR;
    const isV4Mapped = groups.slice(0, 5).every((g) => g === "0000") && groups[5] === "ffff";
    if (isV4Mapped) {
      const high = parseInt(groups[6], 16);
      const low = parseInt(groups[7], 16);
      return `v4:${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
    return `v6:${groups.slice(0, 4).join(":")}::/64`;
  }

  return UNKNOWN_VISITOR;
}

/** Identité réseau normalisée d'une requête HTTP (en-têtes uniquement). */
export function networkIdentityFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return normalizeVisitorAddress(first);
  return normalizeVisitorAddress(request.headers.get("x-real-ip"));
}

/**
 * Secret HMAC lu depuis l'environnement serveur.
 * Absent ou trop court → null : l'appelant doit refuser la requête (fail-closed),
 * quel que soit l'environnement. Les tests injectent une valeur explicite.
 */
export function visitorHmacSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env[VISITOR_HMAC_SECRET_ENV];
  if (typeof secret !== "string" || secret.length < VISITOR_HMAC_SECRET_MIN_LENGTH) return null;
  return secret;
}

/** HMAC-SHA256(secret, identité normalisée), en hexadécimal (64 caractères). */
export function hashVisitorIdentity(identity: string, secret: string): string {
  return createHmac("sha256", secret).update(identity, "utf8").digest("hex");
}

/** Clé visiteur d'une requête : HMAC de l'identité réseau normalisée. */
export function visitorKeyFromRequest(request: Request, secret: string): string {
  return hashVisitorIdentity(networkIdentityFromRequest(request), secret);
}

/** Forme tronquée, seule autorisée dans les journaux. */
export function visitorLogId(visitorKey: string): string {
  return visitorKey.slice(0, 12);
}
