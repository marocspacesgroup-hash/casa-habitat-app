export type SeoGuide = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  relatedNeighborhoods: string[];
  relatedLinks: Array<{ href: string; label: string }>;
};

export const SEO_GUIDES: SeoGuide[] = [
  {
    slug: "louer-appartement-casablanca",
    title: "Louer un appartement à Casablanca : méthode et points à vérifier",
    description:
      "Guide pratique pour louer un appartement à Casablanca : quartier, budget, état du bien, dossier, bail, visite et vérifications avant engagement.",
    intro:
      "Louer à Casablanca ne consiste pas seulement à comparer des loyers. Le bon choix dépend du quartier, du type de bien, de la durée, de l'état de l'immeuble et des conditions du bail. Ce guide propose une méthode simple pour comparer des biens réels sans se fier uniquement à une annonce.",
    sections: [
      {
        heading: "1. Définir le besoin avant de visiter",
        paragraphs: [
          "Commencez par fixer le budget mensuel, la durée envisagée, le nombre de chambres, le besoin éventuel de parking et le niveau de meublé recherché.",
          "Séparez les critères indispensables des critères de confort. Cela évite de multiplier les visites de biens qui ne correspondent pas réellement au projet."
        ],
        bullets: [
          "Budget maximum réellement supportable",
          "Quartiers acceptables et temps de trajet",
          "Meublé ou non meublé",
          "Nombre de chambres et surface minimale",
          "Parking, ascenseur, extérieur et climatisation"
        ]
      },
      {
        heading: "2. Comparer le quartier et le micro-emplacement",
        paragraphs: [
          "À Casablanca, deux logements portant le même nom de quartier peuvent présenter des environnements très différents. La rue, l'immeuble, le stationnement, le bruit, l'accès aux commerces et la qualité des parties communes doivent être examinés.",
          "Une page de quartier peut aider à comprendre le secteur, mais elle ne remplace jamais la visite du bien précis."
        ]
      },
      {
        heading: "3. Examiner le logement et l'immeuble",
        paragraphs: [
          "Pendant la visite, vérifiez l'état général, la lumière naturelle, l'aération, les équipements annoncés, l'état des parties communes et les éventuelles nuisances.",
          "Demandez aussi les conditions précises du bail et les documents nécessaires avant de prendre un engagement."
        ]
      },
      {
        heading: "4. Comparer les offres avec les mêmes critères",
        paragraphs: [
          "Un loyer plus élevé n'est pas automatiquement excessif et un loyer plus bas n'est pas automatiquement une bonne affaire. Comparez des biens réellement comparables en surface, état, emplacement, équipement et durée de location.",
          "Casa Habitat privilégie une présentation factuelle des biens disponibles et distingue les informations vérifiables des appréciations commerciales."
        ]
      }
    ],
    relatedNeighborhoods: ["Maârif", "Les Princesses", "Racine", "Gauthier", "Palmier"],
    relatedLinks: [
      { href: "/locations", label: "Voir les locations disponibles" },
      { href: "/locations/meublees", label: "Voir les locations meublées" },
      { href: "/quartiers", label: "Explorer les quartiers de Casablanca" }
    ]
  },
  {
    slug: "choisir-quartier-casablanca",
    title: "Quel quartier choisir à Casablanca pour louer ou acheter ?",
    description:
      "Comment comparer les quartiers de Casablanca selon budget, trajet, style de vie, type de bien et projet immobilier.",
    intro:
      "Il n'existe pas un quartier idéal pour tous les projets immobiliers à Casablanca. Le choix dépend du budget, de la mobilité, du type de logement recherché et de l'usage du bien. Voici une grille de comparaison utilisable avant une recherche immobilière.",
    sections: [
      {
        heading: "Commencer par le projet, pas par le nom du quartier",
        paragraphs: [
          "Une recherche de résidence principale, de location meublée, de logement familial ou d'investissement ne conduit pas nécessairement vers les mêmes secteurs.",
          "Définissez d'abord l'usage du bien, puis éliminez les quartiers incompatibles avec votre budget ou vos contraintes de déplacement."
        ]
      },
      {
        heading: "Comparer cinq critères",
        paragraphs: [
          "Pour chaque quartier, comparez au minimum l'accessibilité, l'environnement immédiat, l'offre immobilière disponible, les caractéristiques des immeubles et l'adéquation avec votre budget.",
          "Cette méthode évite de transformer une réputation générale du quartier en conclusion automatique sur un bien précis."
        ],
        bullets: [
          "Temps de trajet vers les lieux importants",
          "Type de biens réellement disponibles",
          "Niveau de standing recherché",
          "Stationnement et mobilité",
          "Budget total du projet"
        ]
      },
      {
        heading: "Quelques secteurs à étudier",
        paragraphs: [
          "Maârif, Les Princesses, Racine, Gauthier, Palmier, Bourgogne, CFC et Anfa présentent des profils différents. Les pages de quartier de Casa Habitat permettent de consulter les informations disponibles et, lorsqu'ils existent, les biens actuellement publiés dans le secteur.",
          "Pour les autres secteurs, la disponibilité doit être vérifiée au moment de la recherche : le catalogue immobilier évolue."
        ]
      }
    ],
    relatedNeighborhoods: ["Maârif", "Les Princesses", "Racine", "Gauthier", "Palmier", "Bourgogne", "CFC", "Anfa"],
    relatedLinks: [
      { href: "/quartiers", label: "Voir tous les quartiers couverts" },
      { href: "/locations", label: "Rechercher une location" },
      { href: "/vente", label: "Voir les biens à vendre" }
    ]
  },
  {
    slug: "confier-bien-location-casablanca",
    title: "Propriétaire à Casablanca : préparer son bien pour la location",
    description:
      "Guide propriétaire pour préparer, positionner et commercialiser un appartement ou une maison à louer à Casablanca.",
    intro:
      "Un bien locatif ne se commercialise pas correctement avec une simple annonce. Le positionnement, les photos, les informations vérifiables, le prix demandé et la sélection des candidats doivent être cohérents.",
    sections: [
      {
        heading: "Préparer le bien",
        paragraphs: [
          "Avant la publication, rassemblez les informations essentielles : adresse ou secteur, surface, nombre de pièces, étage, ascenseur, parking, état, équipements, disponibilité et conditions de location.",
          "Une présentation précise réduit les demandes mal qualifiées et améliore la qualité des visites."
        ]
      },
      {
        heading: "Positionner le prix avec méthode",
        paragraphs: [
          "Le prix doit être comparé à des biens réellement comparables. Il faut distinguer prix affiché, caractéristiques du bien et valeur réellement négociable.",
          "Une moyenne de quartier ne constitue pas à elle seule une estimation fiable d'un appartement précis."
        ]
      },
      {
        heading: "Commercialiser avec des informations vérifiables",
        paragraphs: [
          "Les photos doivent représenter le bien réel et les caractéristiques importantes doivent être clairement indiquées. Les éléments susceptibles d'évoluer, comme la disponibilité, doivent être maintenus à jour.",
          "Casa Habitat peut relier une présentation propriétaire à son catalogue public et aux demandes correspondant au profil du bien."
        ]
      },
      {
        heading: "Sécuriser le processus",
        paragraphs: [
          "Avant la signature, les conditions convenues doivent être clarifiées et les documents nécessaires vérifiés. La sélection d'un dossier doit rester fondée sur des critères pertinents pour la location et sur les informations effectivement fournies."
        ]
      }
    ],
    relatedNeighborhoods: ["Maârif", "Les Princesses", "Racine", "Gauthier", "Palmier"],
    relatedLinks: [
      { href: "/confier-mon-bien", label: "Confier un bien à Casa Habitat" },
      { href: "/estimation", label: "Demander une estimation" },
      { href: "/gestion-locative", label: "Découvrir la gestion locative" }
    ]
  },
  {
    slug: "acheter-appartement-casablanca",
    title: "Acheter un appartement à Casablanca : vérifications essentielles",
    description:
      "Guide pratique pour préparer l'achat d'un appartement à Casablanca : quartier, état, copropriété, documents, budget et visite.",
    intro:
      "Un achat immobilier à Casablanca mérite une analyse plus large que le prix au mètre carré. Le quartier, l'immeuble, l'état du logement, les documents et les conditions de la transaction doivent être examinés avant tout engagement.",
    sections: [
      {
        heading: "Définir le budget complet",
        paragraphs: [
          "Le budget d'achat doit intégrer le prix du bien mais aussi les frais liés à l'acquisition, les éventuels travaux, l'ameublement et les charges prévisibles.",
          "Définissez également le financement et la marge disponible avant de multiplier les visites."
        ]
      },
      {
        heading: "Analyser le bien et son environnement",
        paragraphs: [
          "Visitez le logement à différents moments lorsque cela est possible. Examinez la luminosité, l'exposition, les nuisances, l'état de l'immeuble, les parties communes, l'ascenseur et le stationnement.",
          "Le micro-emplacement peut modifier fortement l'intérêt d'un bien à l'intérieur d'un même quartier."
        ]
      },
      {
        heading: "Vérifier les éléments documentaires",
        paragraphs: [
          "Avant toute décision, faites vérifier les documents de propriété, la situation de la copropriété et les éléments juridiques pertinents avec les professionnels compétents.",
          "Une annonce immobilière ne constitue pas une preuve juridique de propriété ou de conformité."
        ]
      },
      {
        heading: "Comparer sans se limiter au prix au m²",
        paragraphs: [
          "Le prix au mètre carré est un indicateur de comparaison, pas une formule automatique de valeur. Deux appartements de même surface peuvent différer fortement selon leur étage, leur état, leur vue, leur immeuble et leurs prestations."
        ]
      }
    ],
    relatedNeighborhoods: ["Racine", "Gauthier", "Maârif", "Bourgogne", "Anfa"],
    relatedLinks: [
      { href: "/vente", label: "Voir les biens à vendre" },
      { href: "/quartiers", label: "Comparer les quartiers" },
      { href: "/contact", label: "Parler à Casa Habitat" }
    ]
  },
  {
    slug: "investissement-locatif-casablanca",
    title: "Investissement locatif à Casablanca : construire une analyse réaliste",
    description:
      "Méthode pour analyser un investissement locatif à Casablanca : budget, quartier, loyer, charges, vacance, travaux et scénario de rendement.",
    intro:
      "Un investissement locatif doit être étudié comme un projet économique, pas comme une simple comparaison de prix. Le rendement dépend du prix d'acquisition, du loyer réellement envisageable, des charges, des travaux, de la vacance et du mode de gestion.",
    sections: [
      {
        heading: "Partir du bien réel",
        paragraphs: [
          "Commencez par les caractéristiques concrètes : emplacement, surface, état, étage, parking, ameublement éventuel et type de demande locative susceptible de correspondre au logement.",
          "Une moyenne de quartier peut aider à cadrer une recherche, mais elle ne remplace pas l'analyse du bien."
        ]
      },
      {
        heading: "Construire plusieurs scénarios",
        paragraphs: [
          "Calculez au minimum un scénario prudent, un scénario central et un scénario favorable. Intégrez les périodes sans locataire, les charges, les travaux, la fiscalité applicable et les frais de gestion pertinents.",
          "L'objectif est de connaître la sensibilité du projet aux hypothèses plutôt que de retenir uniquement le scénario le plus favorable."
        ]
      },
      {
        heading: "Choisir l'usage avant de calculer le rendement",
        paragraphs: [
          "Location longue durée, location meublée et courte durée répondent à des logiques différentes. Le niveau de gestion, les coûts et la régularité des revenus ne sont pas identiques.",
          "Le choix doit être cohérent avec le règlement de copropriété, les règles applicables et la réalité de la demande."
        ]
      },
      {
        heading: "Relier l'analyse au marché local",
        paragraphs: [
          "À Casablanca, le quartier et le micro-emplacement influencent fortement le profil de demande. Les données de marché doivent toujours être datées et leur méthode comprise avant d'être utilisées dans un calcul."
        ]
      }
    ],
    relatedNeighborhoods: ["Maârif", "Les Princesses", "Racine", "Gauthier", "CFC", "Anfa"],
    relatedLinks: [
      { href: "/investissement", label: "Découvrir l'accompagnement investissement" },
      { href: "/vente", label: "Voir les biens à vendre" },
      { href: "/estimation", label: "Demander une estimation" }
    ]
  }
];
