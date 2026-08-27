export const fr = {
  language: "Français",
  languageShort: "FR",
  navigation: {
    locations: "Locations",
    sale: "Vente",
    shortTerm: "Courte durée",
    neighborhoods: "Quartiers",
    about: "À propos",
    contact: "Contact",
    owners: "Confier mon bien",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
  home: {
    heroTitle: "Trouvez votre bien à Casablanca, sans compromis.",
    featuredTitle: "Des biens choisis, pas listés.",
    featuredDescription:
      "Un aperçu de notre portefeuille — la disponibilité évolue au fil des visites, contactez-nous pour l'état actualisé.",
    servicesTitle: "Quatre métiers, une même exigence.",
    neighborhoodsTitle: "Les quartiers que nous connaissons.",
    contactTitle: "Un interlocuteur unique, du premier échange aux clés.",
  },
} as const;

export type Locale = {
  language: string;
  languageShort: string;
  navigation: {
    locations: string;
    sale: string;
    shortTerm: string;
    neighborhoods: string;
    about: string;
    contact: string;
    owners: string;
    openMenu: string;
    closeMenu: string;
  };
  home: {
    heroTitle: string;
    featuredTitle: string;
    featuredDescription: string;
    servicesTitle: string;
    neighborhoodsTitle: string;
    contactTitle: string;
  };
};