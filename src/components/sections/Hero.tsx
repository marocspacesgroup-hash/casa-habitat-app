import { getNeighborhoods } from "@/lib/supabase/queries";
import SearchBar from "./SearchBar";

export default async function Hero() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="relative bg-navy pt-36 pb-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #C9A35A 0px, #C9A35A 1px, transparent 1px, transparent 64px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-px bg-gold" />
          <span className="eyebrow text-gold">
            Immobilier de Prestige — Casablanca
          </span>
        </div>
        <h1 className="font-display text-ivory text-[clamp(34px,5vw,58px)] leading-[1.08] max-w-3xl mb-6">
          Trouvez votre bien à Casablanca,{" "}
          <em className="text-gold not-italic italic">sans compromis.</em>
        </h1>
        <p className="text-ivory/70 max-w-xl text-[16px] mb-12">
          Vente, location et courte durée — une sélection de biens vérifiés,
          accompagnée par un interlocuteur unique du premier échange à la
          remise des clés.
        </p>

        <SearchBar neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
