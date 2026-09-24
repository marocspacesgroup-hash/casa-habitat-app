import { COUNT_MARGIN_PERCENT, INPUT_CAP_TOKENS, PRICE_NANO_PER_TOKEN } from "./limits";

/** Consommation déclarée par Anthropic pour un appel (champ `usage`). */
export interface ModelUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number | null;
    ephemeral_1h_input_tokens?: number | null;
  } | null;
  service_tier?: string | null;
  server_tool_use?: Record<string, unknown> | null;
}

/** Vrai si `server_tool_use` signale au moins une utilisation d'outil serveur (payant). */
function usesServerTools(value: ModelUsage["server_tool_use"]): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((n) => typeof n === "number" && n > 0);
}

export interface CostBreakdown {
  /** Coût réel, prudence 1,1 incluse, en nanodollars. */
  costNano: number;
  /** Tokens d'entrée réellement facturés (non cachés + écriture + lecture). */
  billedInputTokens: number;
  /** Vrai si l'usage révèle un mode interdit : cache 1 h, tier non standard, outil serveur. */
  forbiddenUsage: boolean;
}

function count(value: number | null | undefined): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

/** Vérifie qu'un nombre de tokens déclaré est exploitable. */
function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Vrai si `usage` contient au minimum les deux compteurs obligatoires. */
export function isUsableUsage(usage: unknown): usage is ModelUsage {
  if (!usage || typeof usage !== "object") return false;
  const u = usage as Record<string, unknown>;
  return isTokenCount(u.input_tokens) && isTokenCount(u.output_tokens);
}

/**
 * Coût réel d'un appel :
 * (entrée × prix entrée + écriture cache × prix écriture + lecture cache ×
 * prix lecture + sortie × prix sortie) × 1,1 — le facteur est déjà inclus
 * dans les tarifs de `PRICE_NANO_PER_TOKEN`.
 */
export function actualCost(usage: ModelUsage): CostBreakdown {
  const input = count(usage.input_tokens);
  const output = count(usage.output_tokens);
  const cacheRead = count(usage.cache_read_input_tokens);
  const cacheWriteTotal = count(usage.cache_creation_input_tokens);
  const write1h = count(usage.cache_creation?.ephemeral_1h_input_tokens);
  // Sans ventilation, toute écriture est comptée au tarif 5 min ; la part 1 h,
  // interdite, est toujours chiffrée à son propre tarif.
  const write5m = Math.max(0, cacheWriteTotal - write1h);

  const costNano =
    input * PRICE_NANO_PER_TOKEN.input +
    write5m * PRICE_NANO_PER_TOKEN.cacheWrite5m +
    write1h * PRICE_NANO_PER_TOKEN.cacheWrite1h +
    cacheRead * PRICE_NANO_PER_TOKEN.cacheRead +
    output * PRICE_NANO_PER_TOKEN.output;

  return {
    costNano,
    billedInputTokens: input + cacheWriteTotal + cacheRead,
    // Cache 1 h, tier prioritaire ou batch, outils serveur : tous hors du tarif
    // réservé. Le coût reste chiffré au mieux, mais l'anomalie coupe l'agent.
    forbiddenUsage:
      write1h > 0 ||
      (typeof usage.service_tier === "string" && usage.service_tier !== "standard") ||
      usesServerTools(usage.server_tool_use),
  };
}

/**
 * Plafond d'entrée : refus si `comptage × 1,05 > 30 000`.
 * Comparaison en entiers (× 100) pour éviter tout arrondi.
 */
export function exceedsInputCap(countedTokens: number): boolean {
  if (!Number.isSafeInteger(countedTokens) || countedTokens < 0) return true;
  return countedTokens * (100 + COUNT_MARGIN_PERCENT) > INPUT_CAP_TOKENS * 100;
}
