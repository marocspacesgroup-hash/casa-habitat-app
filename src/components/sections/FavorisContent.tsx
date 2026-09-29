"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { PublicListingCard } from "@/data/types";
import ListingCard from "@/components/ui/ListingCard";
import { useTranslation } from "@/hooks/useTranslation";

export default function FavorisContent({ listings }: { listings: PublicListingCard[] }) {
  const { favorites } = useFavorites();
  const { translation } = useTranslation();
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
          {translation.pages.favorites.title} <em className="text-gold not-italic italic">{translation.pages.favorites.emphasis}</em>
        </h1>
        <p className="text-ink-soft max-w-xl mb-14">
          {translation.pages.favorites.description}
        </p>

        {favoriteListings.length === 0 ? (
          <div className="border border-ink/10 rounded-sm p-12 text-center">
            <p className="text-ink-soft mb-4">
              {translation.pages.favorites.empty}
            </p>
            <Link
              href="/locations"
              className="text-sm font-semibold text-navy border-b border-gold pb-0.5"
            >
              {translation.pages.favorites.browse}
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
