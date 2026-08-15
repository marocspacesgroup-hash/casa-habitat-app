"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { listings } from "@/data/listings";
import ListingCard from "@/components/ui/ListingCard";

export default function FavorisContent() {
  const { favorites } = useFavorites();
  const favoriteListings = listings.filter((l) =>
    favorites.includes(l.reference)
  );

  return (
    <div className="pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Favoris
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
          Vos biens <em className="text-gold not-italic italic">enregistrés.</em>
        </h1>
        <p className="text-ink-soft max-w-xl mb-14">
          Enregistrés sur cet appareil uniquement — créez un compte
          prochainement pour les retrouver partout.
        </p>

        {favoriteListings.length === 0 ? (
          <div className="border border-ink/10 rounded-sm p-12 text-center">
            <p className="text-ink-soft mb-4">
              Aucun bien en favori pour le moment.
            </p>
            <Link
              href="/locations"
              className="text-sm font-semibold text-navy border-b border-gold pb-0.5"
            >
              Parcourir les biens →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {favoriteListings.map((l) => (
              <ListingCard key={l.reference} listing={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
