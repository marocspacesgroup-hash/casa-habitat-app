import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { whatsappGeneral } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Casa Habitat, agence immobilière premium à Casablanca — vente, location, gestion et conseil en investissement.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          L&apos;agence
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-8">
          {siteConfig.name} — <em className="text-gold not-italic italic">{siteConfig.tagline}</em>
        </h1>

        <p className="text-ink-soft mb-6 leading-relaxed text-[17px]">
          {siteConfig.description}
        </p>
        <p className="text-ink-soft mb-6 leading-relaxed">
          Casa Habitat accompagne la vente, la location et la gestion de
          biens à Casablanca, avec un interlocuteur unique du premier échange
          jusqu&apos;à la remise des clés. Chaque bien est visité et qualifié
          avant d&apos;être proposé — pas de catalogue générique.
        </p>
        <p className="text-ink-soft mb-12 leading-relaxed">
          L&apos;agence s&apos;adresse aussi bien à une clientèle résidente
          qu&apos;à une clientèle internationale, avec un accompagnement
          bilingue et une attention particulière portée à la discrétion de
          chaque dossier.
        </p>

        <div className="bg-navy rounded-sm p-8 md:p-10">
          <h2 className="font-display text-ivory text-xl mb-4">
            Nos domaines d&apos;intervention
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3 text-ivory/75 text-sm mb-8">
            <li>— Vente</li>
            <li>— Location</li>
            <li>— Location courte durée</li>
            <li>— Gestion immobilière</li>
            <li>— Conseil en investissement</li>
          </ul>
          <a
            href={whatsappGeneral()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
          >
            Discuter de votre projet
          </a>
        </div>
      </div>
    </div>
  );
}
