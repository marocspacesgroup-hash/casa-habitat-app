/**
 * Configuration de l'agent IA Casa Habitat.
 *
 * Toutes les limites viennent de `finance/limits.ts`, source unique de
 * vérité. Aucune n'est lue depuis la conversation ni depuis le corps de la
 * requête. Le modèle et le nombre de tours ne sont PLUS configurables par
 * variable d'environnement : `AI_AGENT_MODEL` et `AI_AGENT_MAX_TURNS` sont
 * ignorées, pour qu'aucun réglage externe ne puisse dépasser le plafond
 * financier.
 */
import {
  BODY_MAX_BYTES,
  HISTORY_MAX_CHARS,
  HISTORY_MAX_MESSAGES,
  MAX_TURNS_PER_MESSAGE,
  MESSAGE_MAX_CHARS,
  MODEL_ID,
  OUTPUT_CAP_TOKENS,
  RESULTS_PER_REQUEST_MAX,
  RESULTS_PER_SEARCH_MAX,
  TOOL_CALLS_PER_REQUEST_MAX,
  TOOL_CALLS_PER_TURN_MAX,
} from "./finance/limits";

/**
 * Interrupteur global. Ne peut que COUPER l'agent (valeur "false").
 * Une modification de variable sur Vercel exige un redéploiement ; l'arrêt
 * immédiat se fait par le drapeau `kill` dans Redis.
 */
export const AGENT_ENABLED = process.env.AI_AGENT_ENABLED !== "false";

/** Modèle unique, verrouillé dans le code. */
export const AGENT_MODEL = MODEL_ID;

/** Tours modèle maximum par message visiteur. */
export const MAX_TURNS = MAX_TURNS_PER_MESSAGE;

/** Appels d'outils maximum sur l'ensemble d'une requête, tous outils confondus. */
export const MAX_TOOL_CALLS = TOOL_CALLS_PER_REQUEST_MAX;

/** Appels d'outils maximum exécutés dans un même tour. */
export const MAX_TOOL_CALLS_PER_TURN = TOOL_CALLS_PER_TURN_MAX;

/** Caractères maximum acceptés dans un message visiteur. */
export const MAX_MESSAGE_CHARS = MESSAGE_MAX_CHARS;

/** Messages d'historique maximum transmis au modèle (hors message courant). */
export const MAX_HISTORY_MESSAGES = HISTORY_MAX_MESSAGES;

/** Caractères maximum de l'historique transmis (anciens messages retirés d'abord). */
export const MAX_HISTORY_CHARS = HISTORY_MAX_CHARS;

/** Biens maximum renvoyés par un seul appel de recherche. */
export const MAX_RESULTS_PER_SEARCH = RESULTS_PER_SEARCH_MAX;

/**
 * Biens maximum renvoyés sur l'ensemble d'une requête, recherche ET détail.
 * C'est ce plafond global qui empêche l'extraction du catalogue.
 */
export const MAX_RESULTS_PER_REQUEST = RESULTS_PER_REQUEST_MAX;

/** Plafond de tokens de sortie par tour (réflexion comprise). */
export const MAX_OUTPUT_TOKENS = OUTPUT_CAP_TOKENS;

/**
 * Profondeur de raisonnement. « medium » suffit à une qualification
 * immobilière — questions courtes, recherche structurée — et borne le coût.
 */
export const AGENT_EFFORT = "medium" as const;

/** Taille maximale du corps d'une requête. */
export const MAX_BODY_BYTES = BODY_MAX_BYTES;
