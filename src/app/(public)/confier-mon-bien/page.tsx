import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { whatsappOwner } from "@/lib/whatsapp";
import { getNeighborhoods } from "@/lib/supabase/queries";
import OwnerLeadForm from "@/components/sections/OwnerLeadForm";
import TrackedLink from "@/components/ui/TrackedLink";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  const metadata = await getPageMetadata("owner", "/confier-mon-bien");
  return metadata;
}



export default async function ConfierMonBienPage() {
  const neighborhoods = await getNeighborhoods();
  const { translation } = await getServerTranslation();
  const t = translation.pages.owner;
  const reasons = [
    { titre: t.reason1Title, texte: t.reason1Text },
    { titre: t.reason2Title, texte: t.reason2Text },
    { titre: t.reason3Title, texte: t.reason3Text },
    { titre: t.reason4Title, texte: t.reason4Text },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Vente et location de biens immobiliers",
    provider: {
      "@type": "RealEstateAgent",
      name: siteConfig.name,
      telephone: siteConfig.contact.phones[0],
      email: siteConfig.contact.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.contact.address.line1,
        addressLocality: siteConfig.contact.address.city,
        addressCountry: "MA",
      },
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
            {t.eyebrow}
          </span>
          <h1 className="font-display text-ivory text-[clamp(28px,4vw,44px)] mb-6">
            {t.title}{" "}
            <em className="text-gold not-italic italic">{t.emphasis}</em>
          </h1>
          <p className="text-ivory/70 text-[16px] max-w-xl mx-auto mb-4">
            {t.intro}
          </p>
          <p className="text-gold text-[15px] font-medium">
            {t.estimate}
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
              {t.formTitle}
            </h2>
            <p className="text-ink-soft mb-10">
              {t.formText}
            </p>
            <OwnerLeadForm neighborhoods={neighborhoods} />
          </div>

          <aside className="bg-navy rounded-sm p-8 h-fit lg:sticky lg:top-28">
            <h3 className="text-ivory text-lg font-medium mb-2">
              {t.directTitle}
            </h3>
            <p className="text-ivory/60 text-sm mb-6">
              {t.directText}
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
                {t.whatsapp}
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
