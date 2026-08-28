/**
 * Configuration centrale de CASA HABITAT.
 * Toute information de contact ou de marque utilisée ailleurs dans l'app
 * DOIT venir d'ici — ne jamais coder un numéro ou une adresse en dur
 * dans un composant.
 */

export const siteConfig = {
  name: "Casa Habitat",
  tagline: "Immobilier de Prestige",
  description:
    "Agence immobilière premium à Casablanca — vente, location et gestion de biens d'exception pour une clientèle exigeante, marocaine et internationale.",
  url: "https://www.casahabitat.com",
  locale: "fr-MA",

  contact: {
    phones: ["+212632659054", "+212715028235"],
    // Numéro utilisé pour les liens WhatsApp (wa.me n'accepte qu'un seul numéro à la fois)
    whatsappPrimary: "212632659054",
    email: "casahabitat06@gmail.com",
    address: {
      line1: "Socrate, Résidence Dan Hel, 1er étage, rue 40 Attabari",
      city: "Casablanca",
      country: "Maroc",
    },
  },

  social: {
    instagram: "",
    tiktok: "",
    facebook: "",
    youtube: "",
  },

  /**
   * Informations réglementaires — à renseigner par l'agence.
   * Ne jamais afficher de valeur inventée : tant qu'un champ est vide,
   * la page mentions légales affiche "à renseigner", jamais un faux numéro.
   */
  legal: {
    formeJuridique: "",
    rc: "",
    ice: "",
    carteProfessionnelle: "",
  },

  hosting: {
    name: "Vercel Inc.",
    website: "https://vercel.com",
    legalInfo: "https://vercel.com/legal",
  },
} as const;

export const navLinks = [
  { href: "/locations", label: "Locations" },
  { href: "/vente", label: "Vente" },
  { href: "/courte-duree", label: "Courte durée" },
  { href: "/quartiers", label: "Quartiers" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
] as const;

export const ownerNavLink = { href: "/confier-mon-bien", label: "Confier mon bien" } as const;

export const footerLinks = {
  agence: [
    { href: "/locations", label: "Locations" },
    { href: "/vente", label: "Ventes" },
    { href: "/courte-duree", label: "Courte durée" },
    { href: "/quartiers", label: "Quartiers" },
    { href: "/a-propos", label: "À propos" },
    { href: "/confier-mon-bien", label: "Confier mon bien" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/politique-confidentialite", label: "Politique de confidentialité" },
  ],
} as const;
