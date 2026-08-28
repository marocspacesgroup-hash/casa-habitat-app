import { Neighborhood } from "./types";

export const CASABLANCA_QUARTIERS = [
  "Triangle d'or",
  "Anfa / Casa Anfa",
  "Maârif",
  "Racine",
  "Gauthier",
  "Palmier",
  "Val Fleuri",
  "CIL",
  "Les Princesses",
  "Casablanca Finance City (CFC)",
  "Ferme Bretonne",
  "Beauséjour",
  "Yacoub El Mansour",
  "Bouskoura",
  "Dar Bouazza",
  "Ghandi",
  "Abdelmoumen",
  "Bourgogne",
  "Oasis",
  "Californie",
  "Corniche / Aïn Diab",
  "Franceville",
  "Les Hôpitaux",
  "Belvédère",
  "2 Mars",
  "Hermitage",
  "Gironde",
  "Mer Sultan",
  "Roche Noire",
  "Sidi Maârouf",
];

const quartierSlugAliases: Record<string, string> = {
  "anfa-casa-anfa": "anfa",
  "casablanca-finance-city-cfc": "cfc",
  "corniche-ain-diab": "ain-diab",
};

export function quartierSlug(nom: string) {
  const slug = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return quartierSlugAliases[slug] ?? slug;
}

/**
 * Quartiers couverts par l'agence. Les descriptions restent volontairement
 * générales (aucune statistique ou information non vérifiable) — à enrichir
 * avec du contenu réel au fur et à mesure.
 */
export const neighborhoods: Neighborhood[] = [
  {
    slug: "maarif",
    nom: "Maârif",
    ville: "Casablanca",
    description:
      "Quartier central et commerçant, très prisé pour sa vie de quartier animée, ses commerces de proximité et sa position centrale dans Casablanca.",
    faits: ["Quartier central", "Commerces à pied", "Bonne desserte routière"],
  },
  {
    slug: "les-princesses",
    nom: "Les Princesses",
    ville: "Casablanca",
    description:
      "Secteur résidentiel du côté de Maarif, apprécié pour son calme et sa proximité avec les commodités du quartier.",
    faits: ["Proche Maarif", "Résidentiel"],
  },
  {
    slug: "racine",
    nom: "Racine",
    ville: "Casablanca",
    description:
      "Quartier résidentiel calme et recherché, réputé pour ses immeubles standing et sa proximité avec les grands axes de la ville.",
    faits: ["Résidentiel", "Standing", "Proche des grands axes"],
  },
  {
    slug: "gauthier",
    nom: "Gauthier",
    ville: "Casablanca",
    description:
      "Quartier central mêlant immeubles résidentiels et bureaux, apprécié pour sa proximité avec le centre d'affaires de Casablanca.",
    faits: ["Mixte résidentiel / bureaux", "Central"],
  },
  {
    slug: "anfa",
    nom: "Anfa / Casa Anfa",
    ville: "Casablanca",
    description:
      "Un des quartiers les plus prestigieux de Casablanca, associé à l'habitat haut de gamme et aux grandes propriétés.",
    faits: ["Haut standing", "Résidences de prestige"],
  },
  {
    slug: "californie",
    nom: "Californie",
    ville: "Casablanca",
    description:
      "Zone résidentielle en développement du côté d'Ain Diab, avec des constructions récentes et une offre en expansion.",
    faits: ["Constructions récentes", "En développement"],
  },
  {
    slug: "cfc",
    nom: "Casablanca Finance City (CFC)",
    ville: "Casablanca",
    description:
      "Quartier proche du pôle financier de Casablanca Finance City, avec une offre résidentielle orientée vers une clientèle active.",
    faits: ["Proche pôle d'affaires"],
  },
  {
    slug: "palmier",
    nom: "Palmier",
    ville: "Casablanca",
    description:
      "Quartier résidentiel calme, apprécié pour son cadre arboré et sa tranquillité relative par rapport au centre-ville.",
    faits: ["Résidentiel", "Calme"],
  },
  {
    slug: "riviera",
    nom: "Riviera",
    ville: "Casablanca",
    description:
      "Secteur résidentiel du côté d'Ain Diab, à proximité du littoral et des zones balnéaires de Casablanca.",
    faits: ["Proche littoral"],
  },
  {
    slug: "bourgogne",
    nom: "Bourgogne",
    ville: "Casablanca",
    description:
      "Quartier résidentiel établi, à proximité du centre-ville et bien desservi par les transports.",
    faits: ["Bien desservi", "Proche centre-ville"],
  },
  {
    slug: "triangle-dor",
    nom: "Triangle d'or",
    ville: "Casablanca",
    description:
      "Secteur d'affaires et résidentiel haut de gamme au cœur de Casablanca, entre les grands boulevards du centre.",
    faits: ["Haut standing", "Secteur d'affaires"],
  },
];

export function getNeighborhoodBySlug(slug: string) {
  return neighborhoods.find((n) => n.slug === slug);
}
