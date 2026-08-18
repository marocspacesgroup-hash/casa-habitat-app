"use client";

import { useRouter, useSearchParams } from "next/navigation";

const publicationOptions = [
  { value: "", label: "Tous" },
  { value: "brouillon", label: "Brouillons" },
  { value: "publie", label: "Publiés" },
  { value: "archive", label: "Archivés" },
];

const availabilityOptions = [
  { value: "", label: "Toutes disponibilités" },
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Réservé" },
  { value: "loue", label: "Loué" },
  { value: "vendu", label: "Vendu" },
];

export default function StatusBadges() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={searchParams.get("publication") ?? ""}
        onChange={(e) => update("publication", e.target.value)}
        className="border border-ink/15 rounded-sm px-3 py-2 text-sm bg-white"
      >
        {publicationOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={searchParams.get("availability") ?? ""}
        onChange={(e) => update("availability", e.target.value)}
        className="border border-ink/15 rounded-sm px-3 py-2 text-sm bg-white"
      >
        {availabilityOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Référence, titre, quartier..."
        defaultValue={searchParams.get("q") ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("q", e.currentTarget.value);
        }}
        className="border border-ink/15 rounded-sm px-3 py-2 text-sm bg-white flex-1 min-w-[200px]"
      />
    </div>
  );
}
