import Link from "next/link";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getNeighborhoods } from "@/lib/supabase/queries";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("neighborhoods", "/quartiers");
}

export default async function QuartiersPage() {
  const neighborhoods = await getNeighborhoods();\n  const { translation } = await getServerTranslation();\n  const t = translation.pages.neighborhoods;
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Zone de couverture
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
          {t.title} <em className="text-gold not-italic italic">{t.emphasis}</em>
        </h1>
        <p className="text-ink-soft max-w-xl mb-14">
          {t.description}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((n) => (
            <Link
              key={n.slug}
              href={`/quartiers/${n.slug}`}
              className="block border border-ink/10 p-7 hover:border-gold transition-colors"
            >
              <h2 className="font-display text-xl text-ink mb-2">{n.nom}</h2>
              <p className="text-ink-soft text-sm mb-4">{n.description}</p>
              <span className="text-xs font-semibold text-navy border-b border-gold pb-0.5">
                {t.view}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
