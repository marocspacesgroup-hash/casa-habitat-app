export type TransactionType = "location" | "vente" | "courte-duree";

export type PropertyType =
  | "appartement"
  | "studio"
  | "villa"
  | "bureau"
  | "autre";

export interface ShortStayPricing {
  parNuit: number;
  parSemaine?: number;
  parMois?: number;
  voyageursMax: number;
}

export interface Listing {
  /** Référence unique, format CH-0001 */
  reference: string;
  slug: string;
  /** Toute donnée avec isDemo=true est un exemple d'interface, pas une vraie annonce */
  isDemo: true;

  titre: string;
  transaction: TransactionType;
  typeBien: PropertyType;

  quartierSlug: string;
  ville: string;

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

  standing: "standard" | "haut-standing" | "prestige";

  equipements: string[];
  description: string;

  courteDuree?: ShortStayPricing;

  photos: { id: string; alt: string }[];

  coordonnees?: { lat: number; lng: number };
}

export interface Neighborhood {
  slug: string;
  nom: string;
  ville: string;
  description: string;
  faits: string[]; // points pratiques courts, factuels
}
