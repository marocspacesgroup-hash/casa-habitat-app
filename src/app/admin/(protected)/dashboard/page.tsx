import Link from "next/link";
import { getAdminListings, getDashboardStats } from "@/lib/supabase/admin-queries";
import StatusBadges from "@/components/admin/StatusBadges";
import ListingsTable from "@/components/admin/ListingsTable";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const stats = await getDashboardStats();
  const listings = await getAdminListings({
    publicationStatus: params.publication,
    availabilityStatus: params.availability,
    search: params.q,
  });

  const cards = [
    { label: "Total", value: stats.total },
    { label: "Publiés", value: stats.publies },
    { label: "Brouillons", value: stats.brouillons },
    { label: "Réservés", value: stats.reserves },
    { label: "Loués", value: stats.loues },
    { label: "Vendus", value: stats.vendus },
    { label: "Archivés", value: stats.archives },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl text-ink">Tableau de bord</h1>
        <Link
          href="/admin/listings/new"
          className="sm:hidden bg-navy text-ivory text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-sm"
        >
          + Nouveau bien
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-ink/10 rounded-sm p-4">
            <div className="text-2xl font-display text-ink">{c.value}</div>
            <div className="text-[11px] font-mono uppercase tracking-wide text-ink-soft mt-1">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <StatusBadges />

      <ListingsTable listings={listings} />
    </div>
  );
}
