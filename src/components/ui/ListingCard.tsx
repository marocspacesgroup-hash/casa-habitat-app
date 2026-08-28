import Link from "next/link";
import { PublicListingCard } from "@/data/types";
import { formatPrice, statusLabel, transactionLabel } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";
import PropertyImage from "./PropertyImage";

export default function ListingCard({ listing }: { listing: PublicListingCard }) {
  const notAvailable = listing.statut !== "disponible";

  return (
    <div className="bg-white border border-ink/8 group">
      <div className="relative aspect-[4/3.2]">
        <div className="absolute inset-0 overflow-hidden rounded-t-[150px]">
          <div className="absolute inset-0 transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]">
            <PropertyImage image={listing.imagePrincipale} />
          </div>
        </div>
        <span className="absolute top-5 left-5 z-10 bg-navy/85 text-gold font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm">
          {transactionLabel(listing.transaction)}
        </span>
        <div className="absolute top-5 right-5 z-10">
          <FavoriteButton reference={listing.reference} />
        </div>
        {notAvailable && (
          <span className="absolute bottom-4 left-5 z-10 bg-ivory/95 text-ink font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm">
            {statusLabel(listing.statut)}
          </span>
        )}
        {listing.isSample && (
          <span className="absolute bottom-4 right-5 z-10 bg-ivory/85 text-ink-soft font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm">
            Exemple
          </span>
        )}
      </div>

      <div className="px-6 pt-6 pb-6">
        <div className="font-mono text-[10.5px] uppercase tracking-widest text-gold mb-2">
          {listing.quartierNom ?? listing.ville}
        </div>
        <h3 className="font-display text-xl text-ink mb-3">{listing.titre}</h3>
        <div className="flex gap-4 flex-wrap mb-4 font-mono text-xs text-ink-soft">
          {listing.pieces && <span>◆ {listing.pieces} pièces</span>}
          <span>◆ {listing.chambres} ch.</span>
          <span>◆ {listing.surfaceM2} m²</span>
          <span>◆ {listing.sallesDeBain} sdb</span>
        </div>
        <div className="flex items-center justify-between border-t border-ink/8 pt-4">
          <div className="font-display text-lg text-ink">
            {formatPrice(listing)}
          </div>
          <Link
            href={`/biens/${listing.slug}`}
            className="text-[11.5px] uppercase tracking-wider font-semibold text-navy border-b border-gold pb-0.5"
          >
            Voir le bien
          </Link>
        </div>
      </div>
    </div>
  );
}
