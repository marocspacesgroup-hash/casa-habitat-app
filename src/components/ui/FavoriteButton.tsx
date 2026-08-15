"use client";

import { useFavorites } from "@/lib/favorites";

export default function FavoriteButton({ reference }: { reference: string }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(reference);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(reference);
      }}
      aria-pressed={active}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className="w-9 h-9 rounded-full bg-navy/70 backdrop-blur flex items-center justify-center hover:bg-navy transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={active ? "#C9A35A" : "none"}
        stroke={active ? "#C9A35A" : "#F7F5F2"}
        strokeWidth="1.6"
      >
        <path d="M12 21s-7.5-4.6-10-9.2C.4 8 2 4.5 5.6 4c2-.3 3.9.6 6.4 3 2.5-2.4 4.4-3.3 6.4-3C21.9 4.5 23.6 8 22 11.8 19.5 16.4 12 21 12 21Z" />
      </svg>
    </button>
  );
}
