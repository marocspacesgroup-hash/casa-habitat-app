import type { Metadata } from "next";
import Link from "next/link";
import { neighborhoods } from "@/data/neighborhoods";

export const metadata: Metadata = {
  title: "Quartiers de Casablanca",
  description:
    "Découvrez les quartiers de Casablanca couverts par Casa Habitat : Maarif, Racine, Gauthier, Anfa, et plus.",
  alternates: { canonical: "/quartiers" },
};

export default function QuartiersPage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Zone de couverture
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
          Les quartiers <em className="text-gold not-italic italic">de Casablanca.</em>
        </h1>
        <p className="text-ink-soft max-w-xl mb-14">
          Chaque quartier a son caractère — voici ceux que Casa Habitat
          connaît et couvre activement.
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
                Voir les biens →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
