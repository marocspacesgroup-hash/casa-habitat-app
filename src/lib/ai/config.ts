/**
 * Limites et configuration de l'agent IA Casa Habitat.
 *
 * Toutes les limites sont des constantes exportées, réunies dans un seul
 * fichier : elles doivent rester auditables d'un coup d'œil. Aucune n'est
 * lue depuis la conversation ni depuis le corps de la requête.
 */

/** Interrupteur global — permet de couper l'agent sans redéployer. */
export const AGENT_ENABLED = process.env.AI_AGENT_ENABLED !== "false";

/**
 * Modèle utilisé. Surchargeable par variable d'environnement pour changer
 * sans toucher au code. Jamais préfixé NEXT_PUBLIC_ : reste côté serveur.
 */
export const AGENT_MODEL = process.env.AI_AGENT_MODEL ?? "claude-opus-5";

/**
 * Tours modèle maximum par requête. Un tour = un appel au modèle.
 * Valeur bornée : une variable d'environnement mal saisie (« abc », « 0 »)
 * donnerait sinon NaN ou zéro, et la boucle ne s'exécuterait jamais —
 * l'agent répondrait « je n'arrive pas à répondre » sans aucune trace.
 */
function boundedTurns(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 6;
  return Math.min(Math.floor(parsed), 12);
}

export const MAX_TURNS = boundedTurns(process.env.AI_AGENT_MAX_TURNS);

/** Appels d'outils maximum sur l'ensemble d'une requête, tous outils confondus. */
export const MAX_TOOL_CALLS = 8;

/** Caractères maximum acceptés dans un message visiteur. */
export const MAX_MESSAGE_CHARS = 1500;

/** Messages d'historique maximum transmis au modèle (hors message courant). */
export const MAX_HISTORY_MESSAGES = 12;

/** Biens maximum renvoyés par un seul appel de recherche. */
export const MAX_RESULTS_PER_SEARCH = 5;

/**
 * Biens maximum renvoyés sur l'ensemble d'une requête, tous appels confondus.
 * C'est ce plafond global — et non celui par appel — qui empêche l'extraction
 * du catalogue par appels successifs.
 */
export const MAX_RESULTS_PER_REQUEST = 12;

/** Durée maximale d'une requête complète, boucle d'outils comprise. */
export const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Plafond de tokens de sortie par tour.
 * Le raisonnement adaptatif est actif par défaut sur les modèles récents et
 * consomme ce même budget : une valeur trop basse tronque la réponse visible.
 */
export const MAX_OUTPUT_TOKENS = 2500;

/**
 * Profondeur de raisonnement. « medium » suffit à une qualification
 * immobilière — questions courtes, recherche structurée — et borne le coût.
 */
export const AGENT_EFFORT = "medium" as const;

/**
 * Limitation de débit par visiteur.
 *
 * Seuils choisis pour ne jamais gêner une conversation humaine : un visiteur
 * qui écrit un message toutes les dix secondes reste sous la barre de la
 * minute, et trente échanges dans l'heure couvrent plusieurs recherches
 * sérieuses. Le mécanisme est dans `rate-limit.ts` ; sa portée réelle y est
 * documentée sans détour.
 */
export const RATE_LIMIT_PER_MINUTE = 5;
export const RATE_LIMIT_PER_HOUR = 30;

/** Requêtes simultanées par visiteur. Deux tolèrent un second onglet. */
export const RATE_LIMIT_CONCURRENT = 2;

/**
 * Taille maximale du corps d'une requête.
 * Douze messages d'historique plafonnés à 1 500 et 3 000 caractères tiennent
 * très largement en deçà : 64 Ko laissent de la marge sans permettre qu'un
 * corps de plusieurs mégaoctets soit lu en mémoire.
 */
export const MAX_BODY_BYTES = 64 * 1024;
