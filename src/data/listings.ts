import { Listing } from "./types";

/**
 * DONNÉES DE DÉMONSTRATION (isDemo: true)
 * Utilisées uniquement pour construire et tester l'interface.
 * À remplacer / compléter par les vraies annonces de l'agence.
 */
export const listings: Listing[] = [
  {
    reference: "CH-0001",
    slug: "cfc-3-pieces-residence-calme",
    isDemo: true,
    titre: "3 pièces, résidence calme",
    transaction: "location",
    typeBien: "appartement",
    quartierSlug: "cfc",
    ville: "Casablanca",
    prix: 14500,
    devise: "DH",
    periodePrix: "mois",
    surfaceM2: 95,
    chambres: 2,
    sallesDeBain: 2,
    ascenseur: true,
    parking: true,
    meuble: true,
    climatisation: true,
    standing: "haut-standing",
    equipements: ["Ascenseur", "Parking", "Climatisation", "Meublé"],
    description:
      "Appartement 3 pièces dans une résidence calme du quartier CFC, meublé et équipé, idéal pour une clientèle en mobilité professionnelle.",
    photos: [{ id: "cfc-1", alt: "Salon de l'appartement CFC" }],
  },
  {
    reference: "CH-0002",
    slug: "gauthier-appartement-238m2",
    isDemo: true,
    titre: "Appartement 238 m²",
    transaction: "vente",
    typeBien: "appartement",
    quartierSlug: "gauthier",
    ville: "Casablanca",
    prix: null,
    devise: "DH",
    surfaceM2: 238,
    chambres: 4,
    sallesDeBain: 3,
    ascenseur: true,
    parking: true,
    meuble: false,
    climatisation: false,
    standing: "prestige",
    equipements: ["Ascenseur", "Parking"],
    description:
      "Grand appartement non meublé de 238 m² à Gauthier, à rénover ou aménager selon les goûts de l'acquéreur.",
    photos: [{ id: "gauthier-1", alt: "Façade de l'immeuble Gauthier" }],
  },
  {
    reference: "CH-0003",
    slug: "boulevard-anfa-220m2-6-pieces",
    isDemo: true,
    titre: "220 m², 6 pièces",
    transaction: "location",
    typeBien: "appartement",
    quartierSlug: "anfa",
    ville: "Casablanca",
    prix: 18000,
    devise: "DH",
    periodePrix: "mois",
    surfaceM2: 220,
    chambres: 4,
    sallesDeBain: 3,
    ascenseur: true,
    parking: true,
    meuble: false,
    climatisation: true,
    standing: "prestige",
    equipements: ["Ascenseur", "Parking", "Climatisation"],
    description:
      "Grand appartement de 220 m² sur le Boulevard Anfa, 6 pièces, non meublé, adapté à une famille ou un usage mixte habitation / bureau.",
    photos: [{ id: "anfa-1", alt: "Séjour de l'appartement Boulevard Anfa" }],
  },
  {
    reference: "CH-0004",
    slug: "californie-studio-meuble",
    isDemo: true,
    titre: "Studio meublé, Californie",
    transaction: "courte-duree",
    typeBien: "studio",
    quartierSlug: "californie",
    ville: "Casablanca",
    prix: 500,
    devise: "DH",
    periodePrix: "nuit",
    surfaceM2: 35,
    chambres: 1,
    sallesDeBain: 1,
    ascenseur: false,
    parking: false,
    meuble: true,
    climatisation: true,
    standing: "standard",
    equipements: ["Climatisation", "Meublé", "Wifi"],
    description:
      "Studio meublé du côté de Californie (Ain Diab Extension), pensé pour des séjours courts.",
    courteDuree: { parNuit: 500, parSemaine: 2800, voyageursMax: 2 },
    photos: [{ id: "californie-1", alt: "Studio meublé Californie" }],
  },
  {
    reference: "CH-0005",
    slug: "racine-villa-prestige",
    isDemo: true,
    titre: "Villa de standing, Racine",
    transaction: "vente",
    typeBien: "villa",
    quartierSlug: "racine",
    ville: "Casablanca",
    prix: null,
    devise: "DH",
    surfaceM2: 420,
    chambres: 5,
    sallesDeBain: 4,
    ascenseur: false,
    parking: true,
    meuble: false,
    climatisation: true,
    standing: "prestige",
    equipements: ["Jardin", "Parking", "Climatisation"],
    description:
      "Villa de standing dans le quartier Racine, avec jardin privatif — exemple d'annonce prestige pour l'interface.",
    photos: [{ id: "racine-1", alt: "Façade villa Racine" }],
  },
  {
    reference: "CH-0006",
    slug: "maarif-bureau-vitrine",
    isDemo: true,
    titre: "Bureau avec vitrine, Maarif",
    transaction: "location",
    typeBien: "bureau",
    quartierSlug: "maarif",
    ville: "Casablanca",
    prix: 9500,
    devise: "DH",
    periodePrix: "mois",
    surfaceM2: 80,
    chambres: 0,
    sallesDeBain: 1,
    ascenseur: true,
    parking: false,
    meuble: false,
    climatisation: true,
    standing: "standard",
    equipements: ["Vitrine", "Climatisation", "Ascenseur"],
    description:
      "Local commercial / bureau avec vitrine sur rue passante à Maarif — exemple d'annonce professionnelle.",
    photos: [{ id: "maarif-1", alt: "Vitrine du local Maarif" }],
  },
];

export function getListingBySlug(slug: string) {
  return listings.find((l) => l.slug === slug);
}

export function getListingsByTransaction(transaction: Listing["transaction"]) {
  return listings.filter((l) => l.transaction === transaction);
}

export function getListingsByNeighborhood(quartierSlug: string) {
  return listings.filter((l) => l.quartierSlug === quartierSlug);
}

export function getSimilarListings(listing: Listing, max = 3) {
  return listings
    .filter(
      (l) =>
        l.slug !== listing.slug &&
        (l.quartierSlug === listing.quartierSlug ||
          l.typeBien === listing.typeBien)
    )
    .slice(0, max);
}
