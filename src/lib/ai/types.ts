import { Listing } from "@/data/types";
import { formatPrice, propertyTypeLabel, statusLabel, transactionLabel } from "@/lib/format";
import { redactLocation } from "./ai-safe";

/**
 * Forme exacte d'un bien telle que l'agent la reçoit.
 *
 * C'est une liste blanche explicite, volontairement construite champ par
 * champ plutôt que dérivée de `Listing`. Raison : le type `Listing` porte
 * un champ `adresse`, que `PUBLIC_LISTING_SELECT` ne sélectionne jamais
 * — il vaut donc toujours `undefined` en lecture publique. Mais si la
 * requête changeait un jour, passer l'objet entier exposerait l'adresse
 * au modèle sans que personne s'en aperçoive.
 *
 * Ici, le modèle ne peut pas recevoir ce qui n'est pas listé ci-dessous.
 * Aucune injection de prompt ne restitue une donnée jamais transmise.
 */
export interface PublicProperty {
  reference: string;
  slug: string;
  titre: string;
  transaction: string;
  typeBien: string;
  quartier: string;
  ville: string;
  prix: string;
  prixNumerique: number | null;
  surfaceM2: number;
  pieces?: number;
  chambres: number;
  sallesDeBain: number;
  meuble: boolean;
  etage?: string;
  ascenseur: boolean;
  parking: boolean;
  climatisation: boolean;
  chauffage: boolean;
  terrasseBalcon?: boolean;
  equipements: string[];
  statutAffiche: string;
  disponibiliteAffichee?: string;
  description: string;
  /** Chemin relatif de la fiche publique. Jamais une URL signée d'image. */
  lienFiche: string;
  /** Vrai = fiche de démonstration. L'agent doit le signaler explicitement. */
  estExemple: boolean;
}

/**
 * Convertit un `Listing` en `PublicProperty` — le DTO « AI-safe ».
 * Les champs absents de cette fonction ne parviennent jamais au modèle :
 * adresse, publication_status, slug_history, seo_*, images signées, id interne.
 * Les champs texte libre passent par `redactLocation` : un nom de voie saisi
 * dans un descriptif n'atteint pas le modèle. Le masquage précède la coupe à
 * 400 caractères, pour qu'une adresse à cheval sur la limite ne passe pas à
 * moitié.
 */
export function toPublicProperty(listing: Listing): PublicProperty {
  return {
    reference: listing.reference,
    slug: listing.slug,
    titre: redactLocation(listing.titre),
    transaction: transactionLabel(listing.transaction),
    typeBien: propertyTypeLabel(listing.typeBien),
    quartier: listing.quartierNom ?? listing.quartierSlug,
    ville: listing.ville,
    prix: formatPrice(listing),
    prixNumerique: listing.prix,
    surfaceM2: listing.surfaceM2,
    pieces: listing.pieces,
    chambres: listing.chambres,
    sallesDeBain: listing.sallesDeBain,
    meuble: listing.meuble,
    etage: listing.etage === undefined ? undefined : redactLocation(listing.etage),
    ascenseur: listing.ascenseur,
    parking: listing.parking,
    climatisation: listing.climatisation,
    chauffage: listing.chauffage,
    terrasseBalcon: listing.terrasseBalcon,
    equipements: listing.equipements.map(redactLocation),
    statutAffiche: statusLabel(listing.statut),
    disponibiliteAffichee:
      listing.disponibilite === undefined ? undefined : redactLocation(listing.disponibilite),
    description: redactLocation(listing.description).slice(0, 400),
    lienFiche: `/biens/${listing.slug}`,
    estExemple: listing.isSample,
  };
}

/** Un appel d'outil demandé par le modèle, sous une forme neutre. */
export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Journal de conversation dans un format indépendant du fournisseur.
 * Chaque implémentation de `LlmProvider` le traduit vers son propre format.
 */
export type AgentMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; calls?: AgentToolCall[] }
  | { role: "tool"; callId: string; result: string };

/** Définition d'outil, neutre vis-à-vis du fournisseur. */
export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Résultat d'un tour de modèle, normalisé. */
export interface AgentTurn {
  text: string;
  calls: AgentToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "refusal" | "other";
}
