import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { whatsappOwner } from "@/lib/whatsapp";
import OwnerLeadForm from "@/components/sections/OwnerLeadForm";
import TrackedLink from "@/components/ui/TrackedLink";

export const metadata: Metadata = {
  title: "Confier mon bien — Vendre ou louer à Casablanca",
  description:
    "Vous souhaitez vendre ou louer votre bien à Casablanca ? Confiez-le à Casa Habitat : estimation juste, sélection de locataires ou acquéreurs qualifiés, accompagnement de bout en bout.",
  alternates: { canonical: "/confier-mon-bien" },
};

const reasons = [
  {
    titre: "Une estimation juste",
    texte: "Basée sur le marché casablancais actuel, pas sur un chiffre gonflé pour signer le mandat.",
  },
  {
    titre: "Des visiteurs qualifiés",
    texte: "Chaque dossier est vérifié avant la visite — vous ne perdez pas de temps avec des curieux.",
  },
  {
    titre: "Un interlocuteur unique",
    texte: "Du premier contact à la signature, vous parlez à la même personne — pas à un standard.",
  },
  {
    titre: "Une diffusion soignée",
    texte: "Votre bien mis en valeur, pas noyé dans un catalogue générique.",
  },
];

export default function ConfierMonBienPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Vente et location de biens immobiliers",
    provider: {
      "@type": "RealEstateAgent",
      name: siteConfig.name,
    },
    areaServed: { "@type": "City", name: "Casablanca" },
  };

  return (
    <div className="pt-32 pb-24">
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Intro éditoriale */}
      <section className="bg-navy py-20 mb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-6 bg-gold text-navy">
            Propriétaires
          </span>
          <h1 className="font-display text-ivory text-[clamp(28px,4vw,44px)] mb-6">
            Confiez votre bien{" "}
            <em className="text-gold not-italic italic">à Casa Habitat</em>
          </h1>
          <p className="text-ivory/70 text-[16px] max-w-xl mx-auto mb-4">
            Nous vous accompagnons pour louer ou vendre votre bien à
            Casablanca avec une stratégie adaptée au marché.
          </p>
          <p className="text-gold text-[15px] font-medium">
            Recevez une première estimation de positionnement de votre bien.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        {/* Pourquoi confier son bien */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {reasons.map((r) => (
            <div key={r.titre}>
              <div className="w-8 h-px bg-gold mb-5" />
              <h2 className="text-ink text-lg font-medium mb-2">{r.titre}</h2>
              <p className="text-ink-soft text-sm">{r.texte}</p>
            </div>
          ))}
        </div>

        {/* Formulaire */}
        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl text-ink mb-2">
              Parlez-nous de votre bien
            </h2>
            <p className="text-ink-soft mb-10">
              Quelques informations suffisent — nous vous recontactons
              rapidement pour en discuter.
            </p>
            <OwnerLeadForm />
          </div>

          <aside className="bg-navy rounded-sm p-8 h-fit lg:sticky lg:top-28">
            <h3 className="text-ivory text-lg font-medium mb-2">
              Vous préférez en parler directement ?
            </h3>
            <p className="text-ivory/60 text-sm mb-6">
              Écrivez-nous sur WhatsApp ou appelez l&apos;agence — même
              démarche, sans formulaire.
            </p>
            <div className="flex flex-col gap-3">
              <TrackedLink
                href={whatsappOwner()}
                target="_blank"
                rel="noopener noreferrer"
                event="owner_cta_click"
                params={{ channel: "whatsapp" }}
                className="bg-gold text-navy text-center font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
              >
                Écrire sur WhatsApp
              </TrackedLink>
              <TrackedLink
                href={`tel:${siteConfig.contact.phones[0]}`}
                event="phone_click"
                params={{ source: "confier_mon_bien" }}
                className="border border-ivory/30 text-ivory text-center text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:border-gold hover:text-gold transition-colors"
              >
                {siteConfig.contact.phones[0]}
              </TrackedLink>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
