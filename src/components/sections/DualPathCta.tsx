import Link from "next/link";

export default function DualPathCta() {
  return (
    <section className="border-b border-ink/10">
      <div className="grid md:grid-cols-2">
        <Link
          href="/locations"
          className="group px-8 py-16 md:py-20 border-b md:border-b-0 md:border-r border-ink/10 hover:bg-navy transition-colors"
        >
          <span className="eyebrow text-gold">Vous cherchez</span>
          <h2 className="font-display text-2xl md:text-[28px] text-ink group-hover:text-ivory mt-3 mb-3 transition-colors">
            Je recherche un bien
          </h2>
          <p className="text-ink-soft group-hover:text-ivory/70 text-sm mb-6 max-w-sm transition-colors">
            Location, vente ou courte durée — parcourez une sélection vérifiée à Casablanca.
          </p>
          <span className="text-sm font-semibold text-navy group-hover:text-gold border-b border-gold pb-1 transition-colors">
            Voir les biens →
          </span>
        </Link>

        <Link
          href="/confier-mon-bien"
          className="group px-8 py-16 md:py-20 hover:bg-navy transition-colors"
        >
          <span className="eyebrow text-gold">Vous possédez un bien</span>
          <h2 className="font-display text-2xl md:text-[28px] text-ink group-hover:text-ivory mt-3 mb-3 transition-colors">
            Je suis propriétaire
          </h2>
          <p className="text-ink-soft group-hover:text-ivory/70 text-sm mb-6 max-w-sm transition-colors">
            Confiez votre bien à Casa Habitat — estimation juste et visiteurs qualifiés.
          </p>
          <span className="text-sm font-semibold text-navy group-hover:text-gold border-b border-gold pb-1 transition-colors">
            Confier mon bien →
          </span>
        </Link>
      </div>
    </section>
  );
}
