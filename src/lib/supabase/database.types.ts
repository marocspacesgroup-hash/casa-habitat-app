/**
 * Types reflétant exactement le schéma SQL validé dans Supabase.
 * À terme, peuvent être régénérés automatiquement avec :
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 * En attendant, ils sont maintenus à la main en miroir du schéma.
 */

export type PublicationStatus = "brouillon" | "publie" | "archive";
export type AvailabilityStatus = "disponible" | "reserve" | "loue" | "vendu";
export type DbTransactionType = "location" | "vente" | "courte_duree";
export type DbPropertyType = "appartement" | "studio" | "villa" | "bureau" | "autre";
export type DbPricePeriod = "mois" | "nuit";
export type DbPropertyCondition =
  | "neuf"
  | "excellent_etat"
  | "bon_etat"
  | "a_rafraichir"
  | "a_renover";
export type DbStandingLevel = "standard" | "haut_standing" | "prestige";

export interface DbNeighborhood {
  slug: string;
  nom: string;
  ville: string;
  description: string | null;
  faits: string[];
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number | null;
}

export interface DbListing {
  id: string;
  reference: string;
  slug: string;
  slug_history: string[];

  publication_status: PublicationStatus;
  availability_status: AvailabilityStatus;

  transaction: DbTransactionType;
  type_bien: DbPropertyType;
  titre: string;
  description: string | null;

  quartier_slug: string;
  ville: string;
  adresse: string | null;

  prix: number | null;
  devise: string;
  periode_prix: DbPricePeriod | null;

  surface_m2: number;
  pieces: number | null;
  chambres: number;
  salles_de_bain: number;
  wc_invites: number | null;
  etage: string | null;

  ascenseur: boolean;
  parking: boolean;
  meuble: boolean;
  climatisation: boolean;
  chauffage: boolean;
  terrasse_balcon: boolean | null;
  etat: DbPropertyCondition | null;
  standing: DbStandingLevel;

  equipements: string[];

  disponibilite: string | null;
  charges_incluses: boolean | null;
  caution: string | null;
  honoraires_agence: string | null;
  conditions_particulieres: string | null;

  courte_duree_details: {
    par_semaine?: number;
    par_mois?: number;
    voyageurs_max?: number;
  } | null;

  seo_title: string | null;
  seo_description: string | null;

  is_sample: boolean;

  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface DbListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  alt: string | null;
  position: number;
  is_primary: boolean;
  created_at: string;
}

/** Forme complète utilisée par l'admin : un bien + ses photos ordonnées. */
export interface DbListingWithImages extends DbListing {
  listing_images: DbListingImage[];
  /** Présent uniquement quand la requête embarque la jointure neighborhoods(nom) */
  neighborhoods?: { nom: string } | null;
}
