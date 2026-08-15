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
