import type { Listing } from "@/data/types";

/**
 * Biens fictifs pour les tests de la frontière de données.
 *
 * Aucun texte réel du catalogue : CH-001 et CH-009 sont des reproductions
 * de la FORME des descriptifs publiés (mêmes motifs, mêmes positions
 * approximatives), avec des noms inventés. Chaque bien porte une adresse
 * interne (« Rue Interdite ») qui ne doit jamais atteindre le modèle.
 */
export function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "00000000-aaaa-4bbb-8ccc-000000000001",
    reference: "CH-900",
    slug: "maarif-appartement-test",
    isSample: false,
    titre: "Appartement lumineux",
    transaction: "location",
    typeBien: "appartement",
    statut: "disponible",
    quartierSlug: "maarif",
    quartierNom: "Maârif",
    ville: "Casablanca",
    adresse: "7 Rue Interdite",
    prix: 12_000,
    devise: "DH",
    periodePrix: "mois",
    surfaceM2: 95,
    pieces: 4,
    chambres: 2,
    sallesDeBain: 2,
    etage: "3ème étage",
    ascenseur: true,
    parking: true,
    meuble: true,
    climatisation: true,
    chauffage: false,
    terrasseBalcon: true,
    standing: "haut-standing",
    equipements: ["Cuisine équipée", "Concierge"],
    description: "Bel appartement traversant, séjour lumineux, cuisine équipée.",
    disponibilite: "Immédiate",
    dateMiseAJour: "2026-09-01",
    imagePrincipale: { kind: "placeholder" },
    images: [],
    coordonnees: { lat: 33.5883, lng: -7.6325 },
    ...overrides,
  };
}

/** Forme du descriptif CH-001 : « 1 place de parking », sans aucune adresse. */
export const CH_001 = listing({
  reference: "CH-001",
  slug: "gauthier-appartement-ch-001",
  quartierSlug: "gauthier",
  quartierNom: "Gauthier",
  description:
    "Appartement de standing situé dans le quartier recherché de Gauthier, proche des commerces, écoles et transports. " +
    "Séjour double baigné de lumière, cuisine américaine équipée, deux chambres avec rangements.\n\n" +
    "Prestations :\n• Ascenseur\n• 1 place de parking sécurisée\n\n" +
    "L’appartement est idéalement situé dans une résidence calme et sécurisée.\n\nCharges : 800 DH par mois.",
});

/** Forme du descriptif CH-009 : voie nommée dans les 400 premiers caractères. */
export const CH_009 = listing({
  reference: "CH-009",
  slug: "racine-appartement-ch-009",
  quartierSlug: "racine",
  quartierNom: "Racine",
  description:
    "Appartement au 5ᵉ étage d'une résidence de standing sécurisée 24h/24, sur le boulevard Exemple Exemplaire, " +
    "au cœur du quartier Racine.\n\nCaractéristiques :\n- Salon double\n- 3 chambres\n- Place de parking en sous-sol",
});

/** Les cinq motifs imposés, répartis sur trois biens, titre compris. */
export const LEAKY = [
  listing({
    reference: "CH-901",
    slug: "maarif-studio-ch-901",
    titre: "Studio 12 Rue Exemple",
    description: "Studio rénové au 12 Rue Exemple, à deux pas de l'Avenue Exemple et du tramway.",
  }),
  listing({
    reference: "CH-902",
    slug: "maarif-bureau-ch-902",
    typeBien: "bureau",
    description: "Plateau de bureaux au 25 Boulevard Exemple, angle Rue Exemple, vue dégagée.",
  }),
  listing({
    reference: "CH-903",
    slug: "maarif-villa-ch-903",
    typeBien: "villa",
    transaction: "vente",
    prix: 4_500_000,
    periodePrix: undefined,
    description: "Villa familiale, Résidence Exemple, 12\nJardin arboré, piscine, 4 chambres.",
  }),
];

/** Tout ce qui ne doit jamais apparaître dans ce qui part vers le modèle. */
export const FORBIDDEN: RegExp[] = [
  /12 Rue Exemple/i,
  /25 Boulevard Exemple/i,
  /Rue Exemple/i,
  /Avenue Exemple/i,
  /Boulevard Exemple/i,
  /Résidence Exemple/i,
  /\bExemple\b/,
  /\bExemplaire\b/,
  /Interdite/,
  /00000000-aaaa/,
  /33\.5883|-7\.6325/,
];
