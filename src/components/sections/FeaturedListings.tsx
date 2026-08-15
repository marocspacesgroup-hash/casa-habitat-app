import Link from "next/link";
import { listings } from "@/data/listings";
import ListingCard from "@/components/ui/ListingCard";
import SectionHead from "@/components/ui/SectionHead";

export default function FeaturedListings() {
  const featured = listings.filter((l) => l.standing === "prestige").slice(0, 3);
  const featuredOrFallback = featured.length ? featured : listings.slice(0, 3);

  return (
    <section className="py-24 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHead
          eyebrow="Sélection premium"
          title="Des biens"
          emphasis="choisis, pas listés."
          description="Un aperçu de notre portefeuille — la disponibilité évolue au fil des visites, contactez-nous pour l'état actualisé."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredOrFallback.map((listing) => (
            <ListingCard key={listing.reference} listing={listing} />
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/locations"
            className="text-sm font-semibold text-navy border-b border-gold pb-1"
          >
            Voir tous les biens →
          </Link>
        </div>
      </div>
    </section>
  );
}
