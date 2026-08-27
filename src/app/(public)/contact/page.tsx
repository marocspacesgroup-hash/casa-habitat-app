import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { whatsappGeneral } from "@/lib/whatsapp";
import ContactForm from "@/components/sections/ContactForm";
import AgencyLocation from "@/components/sections/AgencyLocation";
import TrackedLink from "@/components/ui/TrackedLink";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez Casa Habitat à Casablanca — téléphone, e-mail, WhatsApp.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Contact
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-14">
          Discutons de <em className="text-gold not-italic italic">votre projet.</em>
        </h1>

        <div className="grid md:grid-cols-2 gap-16">
          <ContactForm />

          <div>
            <h2 className="font-display text-xl text-ink mb-6">
              Coordonnées de l&apos;agence
            </h2>
            <dl className="divide-y divide-ink/10">
              <Row k="Adresse" v={`${siteConfig.contact.address.line1}, ${siteConfig.contact.address.city}`} />
              <Row
                k="Téléphone"
                v={siteConfig.contact.phones.join(" · ")}
              />
              <Row k="E-mail" v={siteConfig.contact.email} />
              <Row k="Web" v={siteConfig.url.replace("https://", "")} />
            </dl>

            <div className="flex items-center gap-4 mt-8 bg-navy rounded-sm p-6">
              <div className="flex-1">
                <h3 className="text-ivory text-sm font-semibold mb-1">
                  Réponse la plus rapide
                </h3>
                <p className="text-ivory/60 text-xs">
                  Écrivez-nous directement sur WhatsApp.
                </p>
              </div>
              <TrackedLink
                href={whatsappGeneral()}
                target="_blank"
                rel="noopener noreferrer"
                event="whatsapp_click"
                params={{ source: "contact_page" }}
                className="bg-gold text-navy text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-sm whitespace-nowrap"
              >
                WhatsApp
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
      <AgencyLocation />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4 py-4">
      <dt className="font-mono text-[10.5px] uppercase tracking-widest text-gold min-w-[110px]">
        {k}
      </dt>
      <dd className="text-[14.5px] text-ink">{v}</dd>
    </div>
  );
}
