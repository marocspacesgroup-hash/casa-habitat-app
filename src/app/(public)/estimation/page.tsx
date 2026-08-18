import type { Metadata } from "next";
import EstimationForm from "@/components/sections/EstimationForm";

export const metadata: Metadata = {
  title: "Estimation gratuite",
  description: "Demandez une estimation gratuite de votre bien à Casablanca avec Casa Habitat.",
  alternates: { canonical: "/estimation" },
};

export default function EstimationPage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Estimation
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
          Quelle est la valeur de <em className="text-gold not-italic italic">votre bien ?</em>
        </h1>
        <p className="text-ink-soft mb-14">
          Quelques informations suffisent pour démarrer — nous revenons vers
          vous avec une estimation argumentée, basée sur le marché casablancais actuel.
        </p>
        <EstimationForm />
      </div>
    </div>
  );
}
