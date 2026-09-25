import {
  getNeighborhoods,
  getPublishedListingBySlug,
  getPublishedListings,
  getPublishedListingsByTransaction,
} from "@/lib/supabase/queries";
import { whatsappForListing, whatsappGeneral } from "@/lib/whatsapp";
import { createLead } from "./leads";
import { MAX_RESULTS_PER_SEARCH } from "./config";
import { toPublicProperty, type AgentToolDefinition, type PublicProperty } from "./types";
import type { Listing, TransactionType } from "@/data/types";

/**
 * Outils de l'agent.
 *
 * RÈGLE STRUCTURANTE : aucun outil n'écrit de requête Supabase. Ils appellent
 * exclusivement les fonctions de `lib/supabase/queries.ts`, qui appliquent
 * déjà `publication_status = 'publie'` et la liste blanche de colonnes
 * `PUBLIC_LISTING_SELECT`. Le filtrage additionnel (budget, chambres,
 * surface…) se fait en mémoire sur des objets déjà filtrés et déjà réduits.
 *
 * Conséquence : un brouillon ou une adresse ne peuvent pas être atteints,
 * même par une instruction malveillante — ils ne remontent jamais jusqu'ici.
 */

const TRANSACTIONS: TransactionType[] = ["location", "vente", "courte-duree"];

function normalizeTransaction(value: unknown): TransactionType | null {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase().trim().replace(/[_\s]/g, "-");
  if (v === "courte-duree" || v === "courte-durée") return "courte-duree";
  return TRANSACTIONS.includes(v as TransactionType) ? (v as TransactionType) : null;
}

/** Accent-insensible, pour rapprocher « Maârif » saisi du slug « maarif ». */
function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Résout un quartier saisi en langage naturel vers son slug réel. */
async function resolveQuartierSlug(input: unknown): Promise<string | null> {
  if (typeof input !== "string" || !input.trim()) return null;
  const wanted = fold(input);
  const neighborhoods = await getNeighborhoods();
  const exact = neighborhoods.find((n) => n.slug === wanted);
  if (exact) return exact.slug;
  const partial = neighborhoods.find(
    (n) => fold(n.nom).includes(wanted) || wanted.includes(n.slug)
  );
  return partial?.slug ?? null;
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface SearchOutcome {
  count: number;
  properties: PublicProperty[];
  note?: string;
}

/**
 * Recherche dans le catalogue public.
 * `budget` s'entend comme un plafond : un bien sans prix affiché
 * (« Sur demande ») n'est jamais écarté par un filtre de budget, il est
 * conservé et l'agent doit signaler que son prix n'est pas public.
 */
export async function searchProperties(
  input: Record<string, unknown>,
  remainingBudget: number
): Promise<SearchOutcome> {
  const transaction = normalizeTransaction(input.transaction);
  const quartierSlug = await resolveQuartierSlug(input.quartier_slug ?? input.quartier);

  let listings: Listing[] = transaction
    ? await getPublishedListingsByTransaction(transaction)
    : await getPublishedListings();

  if (quartierSlug) {
    listings = listings.filter((l) => l.quartierSlug === quartierSlug);
  }

  const typeBien = typeof input.type_bien === "string" ? fold(input.type_bien) : null;
  if (typeBien) {
    listings = listings.filter((l) => fold(l.typeBien) === typeBien);
  }

  const budgetMax = positiveNumber(input.budget_max);
  const budgetMin = positiveNumber(input.budget_min);
  let excludedShortStay = false;

  if (budgetMax !== null || budgetMin !== null) {
    // Un prix de courte durée est une nuitée, un prix de location un loyer
    // mensuel : les comparer au même budget donnerait un résultat faux.
    // Sans transaction explicite, on écarte la courte durée du filtre
    // budgétaire plutôt que de mélanger deux unités.
    if (!transaction) {
      const before = listings.length;
      listings = listings.filter((l) => l.periodePrix !== "nuit");
      excludedShortStay = listings.length < before;
    }
    if (budgetMax !== null) {
      listings = listings.filter((l) => l.prix === null || l.prix <= budgetMax);
    }
    if (budgetMin !== null) {
      listings = listings.filter((l) => l.prix === null || l.prix >= budgetMin);
    }
  }

  const chambresMin = positiveNumber(input.chambres_min);
  if (chambresMin !== null) {
    listings = listings.filter((l) => l.chambres >= chambresMin);
  }

  const surfaceMin = positiveNumber(input.surface_min);
  if (surfaceMin !== null) {
    listings = listings.filter((l) => l.surfaceM2 >= surfaceMin);
  }

  if (typeof input.meuble === "boolean") {
    listings = listings.filter((l) => l.meuble === input.meuble);
  }

  const total = listings.length;
  const cap = Math.max(0, Math.min(MAX_RESULTS_PER_SEARCH, remainingBudget));
  const properties = listings.slice(0, cap).map(toPublicProperty);

  const notes: string[] = [];
  if (excludedShortStay) {
    notes.push(
      "Les biens en courte durée ont été écartés de ce filtre budgétaire : leur prix s'entend par nuit et non par mois. Le préciser au visiteur et proposer une recherche dédiée en courte durée."
    );
  }
  if (properties.some((p) => p.prixNumerique === null)) {
    notes.push(
      "Certains biens présentés n'ont pas de prix public (« Sur demande »). Ne jamais leur attribuer un prix ni les déclarer dans le budget : indiquer que le prix s'obtient auprès d'un conseiller."
    );
  }
  if (total > properties.length) {
    notes.push(
      `${total} biens correspondent, ${properties.length} sont présentés ici. Proposer d'affiner la recherche plutôt que de tout lister.`
    );
  }
  if (cap === 0 && total > 0) {
    notes.push(
      "Plafond de résultats atteint pour cette conversation. Inviter à préciser la recherche ou à contacter un conseiller."
    );
  }
  const note = notes.length > 0 ? notes.join(" ") : undefined;

  return { count: total, properties, note };
}

/** Détails publics d'un bien publié, par slug. */
export async function getPropertyDetails(
  input: Record<string, unknown>
): Promise<{ found: boolean; property?: PublicProperty }> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (!slug) return { found: false };
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) return { found: false };
  return { found: true, property: toPublicProperty(listing) };
}

/**
 * Prépare une orientation vers un conseiller humain.
 * N'enregistre rien, ne crée aucun lead, ne contacte personne.
 */
export async function requestHumanContact(
  input: Record<string, unknown>
): Promise<{ whatsappUrl: string; message: string }> {
  const reference = typeof input.reference === "string" ? input.reference.trim() : "";

  if (reference) {
    const listings = await getPublishedListings();
    const listing = listings.find((l) => l.reference === reference);
    if (listing) {
      return {
        whatsappUrl: whatsappForListing(listing, listing.quartierNom),
        message: `Lien WhatsApp préparé pour le bien ${listing.reference}. Inviter le visiteur à cliquer pour poursuivre avec un conseiller Casa Habitat. Ne promettre aucun délai de réponse.`,
      };
    }
  }

  return {
    whatsappUrl: whatsappGeneral(),
    message:
      "Lien WhatsApp général préparé. Inviter le visiteur à cliquer pour poursuivre avec un conseiller Casa Habitat. Ne promettre aucun délai de réponse.",
  };
}


/** Enregistre un prospect après consentement explicite et prépare le handoff WhatsApp. */
export async function createCommercialLead(input: Record<string, unknown>) {
  return createLead({
    conversation_id: typeof input.conversation_id === "string" ? input.conversation_id : "",
    transaction_type: typeof input.transaction_type === "string" ? input.transaction_type : undefined,
    property_type: typeof input.property_type === "string" ? input.property_type : undefined,
    neighborhood: typeof input.neighborhood === "string" ? input.neighborhood : undefined,
    budget_min: typeof input.budget_min === "number" ? input.budget_min : undefined,
    budget_max: typeof input.budget_max === "number" ? input.budget_max : undefined,
    bedrooms_min: typeof input.bedrooms_min === "number" ? input.bedrooms_min : undefined,
    surface_min: typeof input.surface_min === "number" ? input.surface_min : undefined,
    furnished: typeof input.furnished === "boolean" ? input.furnished : undefined,
    name: typeof input.name === "string" ? input.name : undefined,
    phone: typeof input.phone === "string" ? input.phone : undefined,
    email: typeof input.email === "string" ? input.email : undefined,
    whatsapp: typeof input.whatsapp === "string" ? input.whatsapp : undefined,
    preferred_contact: typeof input.preferred_contact === "string" ? input.preferred_contact : undefined,
    timing: typeof input.timing === "string" ? input.timing : undefined,
    urgency: typeof input.urgency === "string" ? input.urgency : undefined,
    occupants: typeof input.occupants === "number" ? input.occupants : undefined,
    viewed_properties: Array.isArray(input.viewed_properties) ? input.viewed_properties.filter((v): v is string => typeof v === "string") : undefined,
    requested_property_reference: typeof input.requested_property_reference === "string" ? input.requested_property_reference : undefined,
    consent: input.consent === true,
  });
}

export const TOOL_DEFINITIONS: AgentToolDefinition[] = [
  {
    name: "search_properties",
    description:
      "Recherche des biens dans le catalogue public de Casa Habitat. Tous les filtres sont facultatifs — appeler sans filtre pour un aperçu. Ne renvoie que des biens publiés.",
    inputSchema: {
      type: "object",
      properties: {
        transaction: {
          type: "string",
          enum: ["location", "vente", "courte-duree"],
          description: "Type de transaction recherché.",
        },
        type_bien: {
          type: "string",
          description: "Type de bien : appartement, studio, villa, bureau, autre.",
        },
        quartier: {
          type: "string",
          description: "Nom du quartier tel que formulé par le visiteur, ex. « Maarif ».",
        },
        budget_min: { type: "number", description: "Budget minimum en dirhams." },
        budget_max: { type: "number", description: "Budget maximum en dirhams." },
        chambres_min: { type: "number", description: "Nombre minimum de chambres." },
        surface_min: { type: "number", description: "Surface minimale en m²." },
        meuble: { type: "boolean", description: "true = meublé, false = non meublé." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_property_details",
    description:
      "Récupère les informations publiques détaillées d'un bien publié à partir de son slug. Renvoie found=false si le bien n'existe pas ou n'est pas publié.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug du bien, ex. « maarif-studio-… »." },
      },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "create_lead",
    description:
      "Enregistre un prospect Casa Habitat après consentement explicite. Utiliser uniquement lorsque le visiteur a clairement accepté d'être recontacté, a fourni son nom si possible et au moins un moyen de contact (téléphone/WhatsApp/email). Ne jamais inventer un consentement ou une coordonnée. Le résultat contient un lien WhatsApp de handoff à présenter au visiteur.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "Identifiant de conversation fourni par l'application." },
        transaction_type: { type: "string", description: "Location longue durée, location courte durée ou achat." },
        property_type: { type: "string", description: "Type de bien recherché." },
        neighborhood: { type: "string", description: "Quartier souhaité." },
        budget_min: { type: "number", description: "Budget minimum en DH." },
        budget_max: { type: "number", description: "Budget maximum en DH." },
        bedrooms_min: { type: "number", description: "Nombre minimum de chambres." },
        surface_min: { type: "number", description: "Surface minimale en m²." },
        furnished: { type: "boolean", description: "Préférence meublé/non meublé." },
        name: { type: "string", description: "Nom du prospect, s'il a été fourni." },
        phone: { type: "string", description: "Téléphone du prospect, s'il a été fourni." },
        email: { type: "string", description: "Email du prospect, s'il a été fourni." },
        whatsapp: { type: "string", description: "Numéro WhatsApp du prospect, s'il a été fourni." },
        preferred_contact: { type: "string", description: "Canal préféré : whatsapp, phone ou email." },
        timing: { type: "string", description: "Date ou délai souhaité." },
        urgency: { type: "string", description: "Niveau d'urgence exprimé par le prospect." },
        occupants: { type: "number", description: "Nombre d'occupants si pertinent." },
        viewed_properties: { type: "array", items: { type: "string" }, description: "Références Casa Habitat déjà présentées ou consultées dans la conversation." },
        requested_property_reference: { type: "string", description: "Référence du bien précis qui motive la demande, si connue." },
        consent: { type: "boolean", description: "true uniquement après accord explicite du visiteur pour être recontacté." },
      },
      required: ["conversation_id", "consent"],
      additionalProperties: false,
    },
  },
  {
    name: "request_human_contact",
    description:
      "Prépare un lien WhatsApp vers un conseiller Casa Habitat. N'enregistre aucune donnée et ne contacte personne — se contente de fournir le lien à présenter au visiteur.",
    inputSchema: {
      type: "object",
      properties: {
        reference: {
          type: "string",
          description: "Référence du bien concerné, ex. « CH-0009 ». Facultatif.",
        },
      },
      additionalProperties: false,
    },
  },
];
