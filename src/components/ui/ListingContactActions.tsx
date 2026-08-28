"use client";

import Link from "next/link";
import { Listing } from "@/data/types";
import { whatsappForListing } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

export default function ListingContactActions({
  listing,
  quartierNom,
}: {
  listing: Pick<Listing, "reference" | "ville">;
  quartierNom?: string;
}) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      <a
        href={whatsappForListing(listing, quartierNom)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent("whatsapp_click", {
            source: "listing_detail",
            reference: listing.reference,
          })
        }
        className="bg-gold text-navy text-center font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
      >
        Demander une visite
      </a>
      <a
        href={`tel:${siteConfig.contact.phones[0]}`}
        onClick={() =>
          trackEvent("phone_click", {
            source: "listing_detail",
            reference: listing.reference,
          })
        }
        className="border border-ivory/30 text-ivory text-center text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:border-gold hover:text-gold transition-colors"
      >
        Appeler l&apos;agence
      </a>
      <Link
        href="/contact"
        className="text-ivory/60 text-center text-xs underline underline-offset-4"
      >
        Contacter Casa Habitat
      </Link>
    </div>
  );
}
