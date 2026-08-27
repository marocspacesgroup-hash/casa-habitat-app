export const fr = {
  nav: {
    rentals: "Locations",
    sales: "Vente",
    shortStay: "Courte durée",
    neighborhoods: "Quartiers",
    about: "À propos",
    contact: "Contact",
    listProperty: "Confier mon bien",
  },
  hero: {
    title: "Trouvez votre bien à Casablanca, sans compromis.",
    subtitle: "Une sélection vérifiée, accompagnée par un interlocuteur unique.",
    searchPlaceholder: "Rechercher un bien",
    ctaButton: "Voir les biens",
  },
  filters: {
    propertyType: "Type de bien",
    city: "Ville",
    budget: "Budget",
    search: "Rechercher",
  },
  properties: {
    featuredTitle: "Des biens choisis, pas listés.",
    rooms: "pièces",
    bathrooms: "sdb",
    area: "m²",
    viewDetails: "Voir le bien",
  },
  contact: {
    title: "Un interlocuteur unique, du premier échange aux clés.",
    namePlaceholder: "Votre nom",
    emailPlaceholder: "Votre adresse e-mail",
    phonePlaceholder: "Votre téléphone",
    messagePlaceholder: "Votre message",
    submitButton: "Envoyer le message",
    successMessage: "Merci, votre message a bien été envoyé.",
  },
  footer: {
    tagline: "Immobilier de prestige à Casablanca.",
    rights: "Tous droits réservés.",
  },
} as const;

export type Locale = {
  nav: {
    rentals: string;
    sales: string;
    shortStay: string;
    neighborhoods: string;
    about: string;
    contact: string;
    listProperty: string;
  };
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    ctaButton: string;
  };
  filters: {
    propertyType: string;
    city: string;
    budget: string;
    search: string;
  };
  properties: {
    featuredTitle: string;
    rooms: string;
    bathrooms: string;
    area: string;
    viewDetails: string;
  };
  contact: {
    title: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    messagePlaceholder: string;
    submitButton: string;
    successMessage: string;
  };
  footer: {
    tagline: string;
    rights: string;
  };
};