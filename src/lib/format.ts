import { Listing } from "@/data/types";

export function formatPrice(listing: Pick<Listing, "prix" | "periodePrix">) {
  if (listing.prix === null) return "Sur demande";
  // fr-FR utilise l'espace comme séparateur de milliers (18 000), plus lisible
  // que le point de fr-MA (18.000) qui peut se confondre avec une décimale.
  const amount = new Intl.NumberFormat("fr-FR").format(listing.prix);
  if (listing.periodePrix === "mois") return `${amount} DH / mois`;
  if (listing.periodePrix === "nuit") return `${amount} DH / nuit`;
  return `${amount} DH`;
}

export function transactionLabel(t: Listing["transaction"]) {
  return { location: "Location", vente: "Vente", "courte-duree": "Courte durée" }[t];
}

/** Titre SEO structuré : type de bien, meublé, chambres, quartier — distinct du titre éditorial affiché en H1. */
export function seoTitle(listing: Listing, quartierNom?: string) {
  const type = propertyTypeLabel(listing.typeBien);
  const meuble = listing.meuble ? " meublé" : "";
  const chambres =
    listing.chambres > 0
      ? ` ${listing.chambres} chambre${listing.chambres > 1 ? "s" : ""}`
      : "";
  const lieu = quartierNom ?? listing.ville;
  return `${type}${meuble}${chambres} — ${lieu}`;
}

export function propertyTypeLabel(t: Listing["typeBien"]) {
  return {
    appartement: "Appartement",
    studio: "Studio",
    villa: "Villa",
    bureau: "Bureau",
    autre: "Autre",
  }[t];
}

export function statusLabel(s: Listing["statut"]) {
  return {
    disponible: "Disponible",
    reserve: "Réservé",
    loue: "Loué",
    vendu: "Vendu",
  }[s];
}

export function conditionLabel(e: NonNullable<Listing["etat"]>) {
  return {
    neuf: "Neuf",
    "excellent-etat": "Excellent état",
    "bon-etat": "Bon état",
    "a-rafraichir": "À rafraîchir",
    "a-renover": "À rénover",
  }[e];
}
