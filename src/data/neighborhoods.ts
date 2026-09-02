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
    latitude: 33.5739,
    longitude: -7.6398,
    zoom: 13,
  },
  {
    slug: "les-princesses",
    nom: "Les Princesses",
    ville: "Casablanca",
    description:
      "Secteur résidentiel du côté de Maarif, apprécié pour son calme et sa proximité avec les commodités du quartier.",
    faits: ["Proche Maarif", "Résidentiel"],
    latitude: 33.5763,
    longitude: -7.6348,
    zoom: 13,
  },
  {
    slug: "racine",
    nom: "Racine",
    ville: "Casablanca",
    description:
      "Quartier résidentiel calme et recherché, réputé pour ses immeubles standing et sa proximité avec les grands axes de la ville.",
    faits: ["Résidentiel", "Standing", "Proche des grands axes"],
    latitude: 33.5864,
    longitude: -7.6124,
    zoom: 13,
  },
  {
    slug: "gauthier",
    nom: "Gauthier",
    ville: "Casablanca",
    description:
      "Quartier central mêlant immeubles résidentiels et bureaux, apprécié pour sa proximité avec le centre d'affaires de Casablanca.",
    faits: ["Mixte résidentiel / bureaux", "Central"],
    latitude: 33.5838,
    longitude: -7.6189,
    zoom: 13,
  },
  {
    slug: "anfa",
    nom: "Anfa / Casa Anfa",
    ville: "Casablanca",
    description:
      "Un des quartiers les plus prestigieux de Casablanca, associé à l'habitat haut de gamme et aux grandes propriétés.",
    faits: ["Haut standing", "Résidences de prestige"],
    latitude: 33.5781,
    longitude: -7.6558,
    zoom: 12.5,
  },
  {
    slug: "californie",
    nom: "Californie",
    ville: "Casablanca",
    description:
      "Zone résidentielle en développement du côté d'Ain Diab, avec des constructions récentes et une offre en expansion.",
    faits: ["Constructions récentes", "En développement"],
    latitude: 33.5669,
    longitude: -7.6635,
    zoom: 12.5,
  },
  {
    slug: "cfc",
    nom: "Casablanca Finance City (CFC)",
    ville: "Casablanca",
    description:
      "Quartier proche du pôle financier de Casablanca Finance City, avec une offre résidentielle orientée vers une clientèle active.",
    faits: ["Proche pôle d'affaires"],
    latitude: 33.5695,
    longitude: -7.6505,
    zoom: 13,
  },
  {
    slug: "palmier",
    nom: "Palmier",
    ville: "Casablanca",
    description:
      "Quartier résidentiel calme, apprécié pour son cadre arboré et sa tranquillité relative par rapport au centre-ville.",
    faits: ["Résidentiel", "Calme"],
    latitude: 33.5485,
    longitude: -7.6314,
    zoom: 13,
  },
  {
    slug: "riviera",
    nom: "Riviera",
    ville: "Casablanca",
    description:
      "Secteur résidentiel du côté d'Ain Diab, à proximité du littoral et des zones balnéaires de Casablanca.",
    faits: ["Proche littoral"],
    latitude: 33.5704,
    longitude: -7.6686,
    zoom: 12.5,
  },
  {
    slug: "bourgogne",
    nom: "Bourgogne",
    ville: "Casablanca",
    description:
      "Quartier résidentiel établi, à proximité du centre-ville et bien desservi par les transports.",
    faits: ["Bien desservi", "Proche centre-ville"],
    latitude: 33.5865,
    longitude: -7.6008,
    zoom: 13,
  },
  {
    slug: "triangle-dor",
    nom: "Triangle d'or",
    ville: "Casablanca",
    description:
      "Secteur d'affaires et résidentiel haut de gamme au cœur de Casablanca, entre les grands boulevards du centre.",
    faits: ["Haut standing", "Secteur d'affaires"],
    latitude: 33.5901,
    longitude: -7.6117,
    zoom: 13,
  },
];

export function getNeighborhoodBySlug(slug: string) {
  return neighborhoods.find((n) => n.slug === slug);
}
