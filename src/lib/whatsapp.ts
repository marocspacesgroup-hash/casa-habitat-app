import { siteConfig } from "@/config/site";
import { Listing } from "@/data/types";

function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.contact.whatsappPrimary}?text=${encoded}`;
}

/** Utilisé sur la page Contact et comme message par défaut (bouton flottant). */
export function whatsappGeneral() {
  return buildWhatsAppUrl(
    "Bonjour Casa Habitat, je souhaite obtenir des informations."
  );
}

/** Utilisé depuis une fiche bien — contextualisé avec la référence et le quartier. */
export function whatsappForListing(
  listing: Pick<Listing, "reference" | "ville">,
  quartierNom?: string
) {
  const lieu = quartierNom ?? listing.ville;
  return buildWhatsAppUrl(
    `Bonjour Casa Habitat, je suis intéressé par le bien ${listing.reference} à ${lieu}.`
  );
}

/** Utilisé depuis la page "Confier mon bien". */
export function whatsappOwner() {
  return buildWhatsAppUrl(
    "Bonjour Casa Habitat, je souhaite vous confier mon bien."
  );
}
