import { siteConfig } from "@/config/site";
import { Listing } from "@/data/types";

function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.contact.whatsappPrimary}?text=${encoded}`;
}

export function whatsappGeneral() {
  return buildWhatsAppUrl(
    "Bonjour Casa Habitat, je souhaiterais avoir plus d'informations sur vos services."
  );
}

export function whatsappForListing(listing: Listing) {
  return buildWhatsAppUrl(
    `Bonjour Casa Habitat, je suis intéressé(e) par le bien "${listing.titre}" (réf. ${listing.reference}). Je souhaiterais obtenir plus d'informations et éventuellement organiser une visite.`
  );
}
