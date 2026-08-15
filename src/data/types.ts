export type TransactionType = "location" | "vente" | "courte-duree";

export type PropertyType =
  | "appartement"
  | "studio"
  | "villa"
  | "bureau"
  | "autre";

export type ListingStatus = "disponible" | "reserve" | "loue" | "vendu";

export type PropertyCondition =
  | "neuf"
  | "excellent-etat"
  | "bon-etat"
  | "a-rafraichir"
  | "a-renover";

export interface ShortStayPricing {
  parNuit: number;
  parSemaine?: number;
  parMois?: number;
  voyageursMax: number;
}

/**
 * Une image de bien. Tant qu'aucune vraie photo n'est fournie, `kind` reste
 * "placeholder" et l'UI affiche un cadre dégradé — jamais un <img> cassé.
 * Une fois le fichier réel déposé dans /public/images/biens/{reference}/,
 * passer à { kind: "photo", src, alt, width, height }.
 */
export type ListingImage =
  | { kind: "placeholder" }
  | { kind: "photo"; src: string; alt: string; width: number; height: number };

export interface Listing {
  /** Identifiant technique stable, indépendant de la référence commerciale */
  id: string;
  /** Référence commerciale affichée, format CH-0001 */
  reference: string;
  slug: string;

  /**
   * Contenu d'exemple utilisé pour construire et tester l'interface.
   * Reste visible avec une mention "Exemple" tant qu'aucune vraie annonce
   * ne le remplace — jamais présenté comme une annonce réelle.
   */
  isSample: true;

  titre: string;
  transaction: TransactionType;
  typeBien: PropertyType;
  statut: ListingStatus;

  quartierSlug: string;
  ville: string;
  /** Adresse précise — à renseigner par l'agence, peut rester vide pour préserver la confidentialité du propriétaire */
  adresse?: string;

  prix: number | null; // null = "Sur demande"
  devise: "DH";
  periodePrix?: "mois" | "nuit"; // pour location / courte durée

  surfaceM2: number;
  chambres: number;
  sallesDeBain: number;
  etage?: string;
  ascenseur: boolean;
  parking: boolean;
  meuble: boolean;
  climatisation: boolean;
  terrasseBalcon?: boolean;
  etat?: PropertyCondition;

  standing: "standard" | "haut-standing" | "prestige";

  equipements: string[];
  description: string;

  disponibilite?: string; // ex. "Immédiate", "À partir du 01/09"
  dateMiseAJour: string; // ISO date, ex. "2026-08-15"

  courteDuree?: ShortStayPricing;

  imagePrincipale: ListingImage;
  images: ListingImage[];

  coordonnees?: { lat: number; lng: number };
}

export interface Neighborhood {
  slug: string;
  nom: string;
  ville: string;
  description: string;
  faits: string[]; // points pratiques courts, factuels
}
