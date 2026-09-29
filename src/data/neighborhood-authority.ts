export type NeighborhoodMarketSnapshot = {
  label: string;
  value: string;
  period: string;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type NeighborhoodAuthority = {
  slug: string;
  intro: string;
  profile: string[];
  buyerSignals: string[];
  ownerSignals: string[];
  market?: NeighborhoodMarketSnapshot;
  sources: Array<{
    label: string;
    date: string;
    url: string;
  }>;
};

const authority = {
  maarif: {
    slug: "maarif",
    intro:
      "Maârif est un secteur central de Casablanca où la lecture immobilière dépend fortement de la rue, de l’immeuble, de l’état du bien et de son usage. Casa Habitat y dispose actuellement de biens publiés, ce qui permet de relier l’analyse du quartier à une offre réelle plutôt qu’à une page générique.",
    profile: [
      "Quartier central et fortement urbain, avec une présence commerciale et résidentielle importante.",
      "Le réseau de transport de Casablanca mentionne Maârif dans son réseau Casabusway, ce qui confirme son rôle dans les déplacements urbains.",
      "Pour une recherche immobilière, le micro-emplacement reste déterminant : une même adresse de quartier peut correspondre à des usages et des niveaux de prestation différents.",
    ],
    buyerSignals: [
      "Comparer la rue, l’exposition, l’état de l’immeuble, l’ascenseur, le stationnement et la qualité des parties communes.",
      "Pour une location, distinguer clairement longue durée, meublé et courte durée avant de comparer les loyers.",
    ],
    ownerSignals: [
      "Pour une mise en location, la présentation du bien doit être cohérente avec son micro-emplacement et son niveau réel de prestation.",
      "Pour une vente, une estimation de quartier ne remplace pas l’analyse du bien précis.",
    ],
    market: {
      label: "Prix demandé médian appartement",
      value: "16 500 DH/m²",
      period: "25 septembre 2026",
      note: "Annonce active, pas prix de transaction signé.",
      sourceLabel: "Mon-bien.ma",
      sourceUrl: "https://www.mon-bien.ma/fr/prix/casablanca/maarif",
    },
    sources: [
      {
        label: "Mon-bien.ma — données de marché Maârif",
        date: "25 septembre 2026",
        url: "https://www.mon-bien.ma/fr/prix/casablanca/maarif",
      },
      {
        label: "Casatramway & Casabusway — réseau de transport",
        date: "consulté le 29 septembre 2026",
        url: "https://www.casatramway.ma/",
      },
      {
        label: "Médias24 — marché immobilier de l’arrondissement du Maârif",
        date: "7 juillet 2024",
        url: "https://medias24.com/2024/07/07/casablanca-loasis-les-princesses-palmier-les-prix-immobiliers-des-quartiers-de-larrondissement-du-maarif/",
      },
    ],
  },
  "les-princesses": {
    slug: "les-princesses",
    intro:
      "Les Princesses constitue un secteur résidentiel de Casablanca que Casa Habitat peut documenter à partir de biens réellement publiés et de sources de marché datées. La comparaison doit toujours tenir compte de la superficie, de l’état, du standing, du stationnement et de l’emplacement précis.",
    profile: [
      "Secteur résidentiel proche de Maârif, avec une offre d’appartements qui varie selon les rues et les résidences.",
      "Les sources immobilières récentes décrivent une demande portée par des profils résidentiels et investisseurs, mais ces observations externes ne remplacent pas l’analyse d’un bien précis.",
      "Casa Habitat dispose actuellement de plusieurs biens publiés dans ce secteur, ce qui permet de consulter directement l’offre disponible.",
    ],
    buyerSignals: [
      "Vérifier le titre foncier, les charges de copropriété, l’état de l’immeuble et la qualité réelle des prestations.",
      "Comparer le prix demandé au bien précis plutôt qu’à une moyenne générale du quartier.",
    ],
    ownerSignals: [
      "Le positionnement du bien doit être défini selon son standing réel, sa surface, son état et sa localisation dans le secteur.",
      "Une estimation sérieuse doit distinguer prix affichés et valeur potentielle du bien après analyse.",
    ],
    market: {
      label: "Prix médian appartement à l’achat",
      value: "14 823 DH/m²",
      period: "1er septembre 2026",
      note: "Médiane d’annonces selon la méthodologie de la source.",
      sourceLabel: "Yesken",
      sourceUrl: "https://yesken.com/prix/casablanca/les-princesses",
    },
    sources: [
      {
        label: "Yesken — prix immobilier Les Princesses",
        date: "1er septembre 2026",
        url: "https://yesken.com/prix/casablanca/les-princesses",
      },
      {
        label: "Menzil — guide Les Princesses / Les Casernes",
        date: "8 avril 2026, mise à jour 23 août 2026",
        url: "https://menzil.ma/ar/guides/marche/immobilier-les-princesses-les-casernes-casablanca-2026",
      },
    ],
  },
  palmier: {
    slug: "palmier",
    intro:
      "Palmier combine une implantation centrale et une lecture plus résidentielle. Pour Casa Habitat, l’intérêt d’une page Palmier est de relier cette réalité locale aux biens actuellement publiés et à des indicateurs de marché explicitement datés.",
    profile: [
      "Secteur central de Casablanca à dominante résidentielle.",
      "Les sources immobilières récentes mettent en avant un compromis entre centralité, usage résidentiel et accessibilité.",
      "L’analyse d’un appartement doit rester liée à son adresse, son immeuble, son état et ses prestations.",
    ],
    buyerSignals: [
      "Comparer les biens sur des critères homogènes : surface, état, étage, ascenseur, parking, extérieur et charges.",
      "Ne pas utiliser une moyenne de quartier comme estimation automatique d’un appartement.",
    ],
    ownerSignals: [
      "Un bien correctement positionné doit être présenté avec ses caractéristiques vérifiables et son micro-emplacement.",
      "La stratégie de mise en location dépend du type de bien et du niveau de prestation, pas uniquement du nom du quartier.",
    ],
    market: {
      label: "Prix demandé médian appartement",
      value: "17 576 MAD/m²",
      period: "26 septembre 2026",
      note: "Annonces actives agrégées ; prix demandé, pas prix de transaction.",
      sourceLabel: "Mon-bien.ma",
      sourceUrl: "https://www.mon-bien.ma/fr/prix/casablanca/palmier",
    },
    sources: [
      {
        label: "Mon-bien.ma — données de marché Palmier",
        date: "26 septembre 2026",
        url: "https://www.mon-bien.ma/fr/prix/casablanca/palmier",
      },
      {
        label: "Century 21 Ollier — guide Palmier",
        date: "consulté le 29 septembre 2026",
        url: "https://century21casablanca.com/casablanca/palmier",
      },
      {
        label: "Médias24 — marché immobilier de l’arrondissement du Maârif",
        date: "7 juillet 2024",
        url: "https://medias24.com/2024/07/07/casablanca-loasis-les-princesses-palmier-les-prix-immobiliers-des-quartiers-de-larrondissement-du-maarif/",
      },
    ],
  },
  gauthier: {
    slug: "gauthier",
    intro:
      "Gauthier est un secteur central mêlant habitat et activités tertiaires. Casa Habitat peut y présenter une expertise utile à condition de distinguer le profil du quartier des caractéristiques du bien précis et de documenter les indicateurs de marché avec leur méthode.",
    profile: [
      "Quartier central de Casablanca, avec une composante résidentielle et de bureaux.",
      "Des sources locales décrivent également un tissu de commerces, cafés, restaurants et équipements culturels.",
      "Le marché affiché présente des écarts importants selon l’état, l’étage, la vue, le stationnement et les prestations.",
    ],
    buyerSignals: [
      "Comparer le niveau de prestation et l’usage recherché avant de comparer les prix.",
      "Pour un appartement, vérifier notamment l’état de l’immeuble, l’ascenseur, le parking et l’exposition.",
    ],
    ownerSignals: [
      "Le positionnement d’un bien à Gauthier doit être fondé sur ses caractéristiques réelles et non sur une étiquette de quartier.",
      "Une stratégie de vente ou de location gagne à documenter clairement les atouts et les limites du bien.",
    ],
    market: {
      label: "Prix demandé médian appartement",
      value: "17 500 DH/m²",
      period: "septembre 2026",
      note: "Médiane d’annonces actives ; prix demandé avant négociation.",
      sourceLabel: "AlerteImmo",
      sourceUrl: "https://alerteimmo.ma/quartiers/casablanca/gauthier",
    },
    sources: [
      {
        label: "AlerteImmo — baromètre Gauthier",
        date: "septembre 2026",
        url: "https://alerteimmo.ma/quartiers/casablanca/gauthier",
      },
      {
        label: "Yesken — prix immobilier Gauthier",
        date: "1er septembre 2026",
        url: "https://yesken.com/prix/casablanca/gauthier",
      },
      {
        label: "Gauthier Casablanca — description du quartier",
        date: "consulté le 29 septembre 2026",
        url: "https://fr.wikipedia.org/wiki/Gauthier_(Casablanca)",
      },
    ],
  },
  bourgogne: {
    slug: "bourgogne",
    intro:
      "Bourgogne est un secteur établi de Casablanca dont la diversité immobilière impose une lecture par micro-emplacement. Casa Habitat y publie actuellement des biens réels et complète cette offre par des informations de marché explicitement datées.",
    profile: [
      "Secteur situé dans le centre-ouest de Casablanca, à proximité du littoral et de quartiers centraux.",
      "Le tissu immobilier y est hétérogène : les caractéristiques des immeubles et des rues peuvent fortement modifier la valeur d’un bien.",
      "Les données de marché disponibles en ligne sont des indicateurs et non des prix de transaction garantis.",
    ],
    buyerSignals: [
      "Examiner l’immeuble et son environnement immédiat plutôt que le seul nom Bourgogne.",
      "Comparer les biens à surface et prestations comparables.",
    ],
    ownerSignals: [
      "Une mise en marché efficace commence par un positionnement réaliste du bien et une présentation documentée.",
      "L’estimation doit tenir compte de l’état, de l’étage, des prestations et du micro-emplacement.",
    ],
    market: {
      label: "Prix moyen appartement à la vente",
      value: "16 344 DH/m²",
      period: "2026",
      note: "Analyse d’annonces ; indicateur externe, non assimilable à un prix signé.",
      sourceLabel: "DarIndex",
      sourceUrl: "https://darindex.com/market-data/casablanca/bourgogne",
    },
    sources: [
      {
        label: "DarIndex — données Bourgogne 2026",
        date: "2026, consulté le 29 septembre 2026",
        url: "https://darindex.com/market-data/casablanca/bourgogne",
      },
      {
        label: "Sekna — immobilier Bourgogne",
        date: "consulté le 29 septembre 2026",
        url: "https://sekna.ma/quartiers/casablanca/bourgogne",
      },
      {
        label: "Bourgogne (Casablanca) — repères géographiques",
        date: "consulté le 29 septembre 2026",
        url: "https://fr.wikipedia.org/wiki/Bourgogne_(Casablanca)",
      },
    ],
  },
  "2-mars": {
    slug: "2-mars",
    intro:
      "2 Mars fait partie des secteurs de Casablanca pour lesquels les indicateurs de marché doivent être lus comme des prix demandés et non comme des prix de transaction. Casa Habitat dispose actuellement d’un bien publié dans ce secteur.",
    profile: [
      "Secteur urbain central de Casablanca, identifié dans le réseau de mobilité de la ville.",
      "L’offre immobilière observée en ligne couvre à la fois la vente et la location.",
      "La valeur d’un bien reste dépendante de sa rue, de l’immeuble, de l’état et des prestations.",
    ],
    buyerSignals: [
      "Comparer des biens réellement comparables en surface, état et prestations.",
      "Vérifier les charges et les caractéristiques de la copropriété avant décision.",
    ],
    ownerSignals: [
      "Un prix de mise en marché doit être relié au bien précis et à son état.",
      "Une présentation claire des caractéristiques vérifiables facilite la comparaison par les prospects.",
    ],
    market: {
      label: "Prix demandé médian appartement",
      value: "13 493 DH/m²",
      period: "septembre 2026",
      note: "Prix demandé issu d’annonces, avant négociation et hors prix de transaction signés.",
      sourceLabel: "AlerteImmo",
      sourceUrl: "https://alerteimmo.ma/quartiers/casablanca/2-mars",
    },
    sources: [
      {
        label: "AlerteImmo — baromètre 2 Mars",
        date: "septembre 2026",
        url: "https://alerteimmo.ma/quartiers/casablanca/2-mars",
      },
      {
        label: "Casatramway — réseau de transport",
        date: "consulté le 29 septembre 2026",
        url: "https://www.casatramway.ma/",
      },
    ],
  },
  "roche-noire": {
    slug: "roche-noire",
    intro:
      "Roche Noire est un secteur de Casablanca où Casa Habitat dispose actuellement d’un bien publié. La page privilégie donc une lecture factuelle du secteur et un indicateur de marché daté, sans transformer une moyenne en estimation automatique.",
    profile: [
      "Secteur de Casablanca identifié dans la commune de Roches Noires.",
      "Le réseau de transport de Casablanca dessert le secteur élargi de Roches Noires par plusieurs axes du réseau.",
      "Les indicateurs immobiliers disponibles en ligne montrent que le niveau de prix varie selon le bien et ne doit pas être assimilé à une valeur de transaction.",
    ],
    buyerSignals: [
      "Comparer l’état de l’immeuble, la rue, l’étage, l’exposition et les prestations.",
      "Vérifier les documents et charges avant toute décision d’achat.",
    ],
    ownerSignals: [
      "Un bien doit être positionné selon ses caractéristiques propres et la demande observable au moment de sa mise en marché.",
      "La présentation doit distinguer clairement les faits vérifiables des appréciations commerciales.",
    ],
    market: {
      label: "Prix demandé médian appartement",
      value: "11 500 MAD/m²",
      period: "25 septembre 2026",
      note: "Médiane de prix affichés ; ce ne sont pas des prix de vente signés.",
      sourceLabel: "Mon-bien.ma",
      sourceUrl: "https://www.mon-bien.ma/fr/prix/casablanca/roches-noires",
    },
    sources: [
      {
        label: "Mon-bien.ma — données Roche Noire",
        date: "25 septembre 2026",
        url: "https://www.mon-bien.ma/fr/prix/casablanca/roches-noires",
      },
      {
        label: "Casatramway — plan et réseau de transport",
        date: "consulté le 29 septembre 2026",
        url: "https://www.casatramway.ma/",
      },
    ],
  },
} satisfies Record<string, NeighborhoodAuthority>;

export const AUTHORITY_READY_NEIGHBORHOODS = Object.keys(authority);

export function getNeighborhoodAuthority(slug: string) {
  return authority[slug as keyof typeof authority] ?? null;
}
