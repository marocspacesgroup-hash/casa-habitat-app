import { Listing } from "./types";
import { placeholderImage } from "@/lib/images";

/**
 * CONTENU D'EXEMPLE (isSample: true)
 * Utilisé pour construire et tester l'interface, affiché avec une mention
 * "Exemple" — à remplacer par les vraies annonces de l'agence. Voir
 * public/images/biens/README.md pour ajouter les vraies photos.
 */
export const listings: Listing[] = [
  {
    id: "listing-0001",
    reference: "CH-0001",
    slug: "cfc-3-pieces-residence-calme",
    isSample: true,
    titre: "3 pièces, résidence calme",
    transaction: "location",
    typeBien: "appartement",
    statut: "disponible",
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
    etat: "excellent-etat",
    standing: "haut-standing",
    equipements: ["Ascenseur", "Parking", "Climatisation", "Meublé"],
    description:
      "Appartement 3 pièces dans une résidence calme du quartier CFC, meublé et équipé, idéal pour une clientèle en mobilité professionnelle.",
    disponibilite: "Immédiate",
    dateMiseAJour: "2026-08-15",
    imagePrincipale: placeholderImage(),
    images: [placeholderImage(), placeholderImage()],
  },
  {
    id: "listing-0002",
    reference: "CH-0002",
    slug: "gauthier-appartement-238m2",
    isSample: true,
    titre: "Appartement 238 m²",
    transaction: "vente",
    typeBien: "appartement",
    statut: "disponible",
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
    etat: "a-rafraichir",
    standing: "prestige",
    equipements: ["Ascenseur", "Parking"],
    description:
      "Grand appartement non meublé de 238 m² à Gauthier, à rénover ou aménager selon les goûts de l'acquéreur.",
    disponibilite: "Immédiate",
    dateMiseAJour: "2026-08-15",
    imagePrincipale: placeholderImage(),
    images: [placeholderImage()],
  },
  {
    id: "listing-0003",
    reference: "CH-0003",
    slug: "boulevard-anfa-220m2-6-pieces",
    isSample: true,
    titre: "220 m², 6 pièces",
    transaction: "location",
    typeBien: "appartement",
    statut: "disponible",
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
    etat: "bon-etat",
    standing: "prestige",
    equipements: ["Ascenseur", "Parking", "Climatisation"],
    description:
      "Grand appartement de 220 m² sur le Boulevard Anfa, 6 pièces, non meublé, adapté à une famille ou un usage mixte habitation / bureau.",
    disponibilite: "Sous préavis",
    dateMiseAJour: "2026-08-15",
    imagePrincipale: placeholderImage(),
    images: [placeholderImage()],
  },
  {
    id: "listing-0004",
    reference: "CH-0004",
    slug: "californie-studio-meuble",
    isSample: true,
    titre: "Studio meublé, Californie",
    transaction: "courte-duree",
    typeBien: "studio",
    statut: "disponible",
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
    etat: "excellent-etat",
    standing: "standard",
    equipements: ["Climatisation", "Meublé", "Wifi"],
    description:
      "Studio meublé du côté de Californie (Ain Diab Extension), pensé pour des séjours courts.",
    disponibilite: "Sur demande",
    dateMiseAJour: "2026-08-15",
    courteDuree: { parNuit: 500, parSemaine: 2800, voyageursMax: 2 },
    imagePrincipale: placeholderImage(),
    images: [placeholderImage()],
  },
  {
    id: "listing-0005",
    reference: "CH-0005",
    slug: "racine-villa-prestige",
    isSample: true,
    titre: "Villa de standing, Racine",
    transaction: "vente",
    typeBien: "villa",
    statut: "disponible",
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
    terrasseBalcon: true,
    etat: "excellent-etat",
    standing: "prestige",
    equipements: ["Jardin", "Parking", "Climatisation"],
    description:
      "Villa de standing dans le quartier Racine, avec jardin privatif — exemple d'annonce prestige pour l'interface.",
    disponibilite: "Immédiate",
    dateMiseAJour: "2026-08-15",
    imagePrincipale: placeholderImage(),
    images: [placeholderImage()],
  },
  {
    id: "listing-0006",
    reference: "CH-0006",
    slug: "maarif-bureau-vitrine",
    isSample: true,
    titre: "Bureau avec vitrine, Maarif",
    transaction: "location",
    typeBien: "bureau",
    statut: "disponible",
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
    etat: "bon-etat",
    standing: "standard",
    equipements: ["Vitrine", "Climatisation", "Ascenseur"],
    description:
      "Local commercial / bureau avec vitrine sur rue passante à Maarif — exemple d'annonce professionnelle.",
    disponibilite: "Immédiate",
    dateMiseAJour: "2026-08-15",
    imagePrincipale: placeholderImage(),
    images: [placeholderImage()],
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
