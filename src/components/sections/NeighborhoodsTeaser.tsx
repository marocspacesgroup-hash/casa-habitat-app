import Link from "next/link";
import { getNeighborhoods } from "@/lib/supabase/queries";
import SectionHead from "@/components/ui/SectionHead";

export default async function NeighborhoodsTeaser() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="bg-[#E4DAC2] py-24 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHead
          eyebrow="Zone de couverture"
          title="Les quartiers"
          emphasis="que nous connaissons."
        />
        <div className="flex flex-wrap">
          {neighborhoods.map((n, i) => (
            <Link
              key={n.slug}
              href={`/quartiers/${n.slug}`}
              className="font-display text-[clamp(19px,2.4vw,28px)] text-ink pr-8 py-3.5 mr-8 border-b border-ink/15 flex-1 min-w-[220px] hover:text-navy transition-colors flex items-baseline gap-2.5"
            >
              <span className="font-mono text-[10px] text-ink-soft shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{n.nom}</span>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/quartiers"
            className="text-sm font-semibold text-navy border-b border-gold pb-1"
          >
            Voir tous les quartiers →
          </Link>
        </div>
      </div>
    </section>
  );
}
