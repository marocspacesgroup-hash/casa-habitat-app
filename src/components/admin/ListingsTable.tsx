"use client";

import Link from "next/link";
import { useTransition } from "react";
import { DbListingWithImages } from "@/lib/supabase/database.types";
import { setPublicationStatus } from "@/app/admin/listings-actions";

const publicationLabels: Record<string, string> = {
  brouillon: "Brouillon",
  publie: "Publié",
  archive: "Archivé",
};

const availabilityLabels: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  loue: "Loué",
  vendu: "Vendu",
};

export default function ListingsTable({ listings }: { listings: DbListingWithImages[] }) {
  const [isPending, startTransition] = useTransition();

  const quickPublish = (id: string, next: "brouillon" | "publie" | "archive") => {
    startTransition(() => {
      setPublicationStatus(id, next);
    });
  };

  if (listings.length === 0) {
    return (
      <div className="bg-white border border-ink/10 rounded-sm p-12 text-center text-ink-soft">
        Aucun bien ne correspond à ces filtres.
      </div>
    );
  }

  return (
    <div className="bg-white border border-ink/10 rounded-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-ink/10 text-left text-[11px] font-mono uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3">Bien</th>
            <th className="px-4 py-3">Quartier</th>
            <th className="px-4 py-3">Transaction</th>
            <th className="px-4 py-3">Prix</th>
            <th className="px-4 py-3">Publication</th>
            <th className="px-4 py-3">Disponibilité</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{l.reference}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{l.titre}</div>
                {l.is_sample && (
                  <span className="text-[10px] font-mono uppercase text-ink-soft">Exemple</span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-soft">{l.quartier_slug}</td>
              <td className="px-4 py-3 text-ink-soft capitalize">{l.transaction.replace("_", " ")}</td>
              <td className="px-4 py-3 text-ink-soft">
                {l.prix ? `${new Intl.NumberFormat("fr-FR").format(l.prix)} DH` : "Sur demande"}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 rounded-sm bg-ink/5">
                  {publicationLabels[l.publication_status]}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft text-xs">
                {availabilityLabels[l.availability_status]}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/listings/${l.id}/edit`}
                    className="text-xs font-semibold text-navy border-b border-gold"
                  >
                    Modifier
                  </Link>
                  {l.publication_status !== "publie" ? (
                    <button
                      disabled={isPending}
                      onClick={() => quickPublish(l.id, "publie")}
                      className="text-xs text-green-700 hover:underline disabled:opacity-40"
                    >
                      Publier
                    </button>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() => quickPublish(l.id, "brouillon")}
                      className="text-xs text-ink-soft hover:underline disabled:opacity-40"
                    >
                      Dépublier
                    </button>
                  )}
                  {l.publication_status !== "archive" && (
                    <button
                      disabled={isPending}
                      onClick={() => quickPublish(l.id, "archive")}
                      className="text-xs text-ink-soft hover:underline disabled:opacity-40"
                    >
                      Archiver
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
