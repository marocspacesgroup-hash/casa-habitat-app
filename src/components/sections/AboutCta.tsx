import Link from "next/link";
import { siteConfig } from "@/config/site";
import { whatsappGeneral } from "@/lib/whatsapp";

export default function AboutCta() {
  return (
    <section className="py-24 md:py-28">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
            L&apos;agence
          </span>
          <h2 className="font-display text-[clamp(26px,3.2vw,38px)] text-ink mb-5">
            Un interlocuteur unique,{" "}
            <em className="text-gold not-italic italic">du premier échange aux clés.</em>
          </h2>
          <p className="text-ink-soft mb-8 max-w-md">
            Casa Habitat accompagne une clientèle exigeante — expatriés et
            résidents — avec un accompagnement bilingue, une sélection
            resserrée et une discrétion totale sur chaque dossier.
          </p>
          <Link
            href="/a-propos"
            className="text-sm font-semibold text-navy border-b border-gold pb-1"
          >
            En savoir plus sur l&apos;agence →
          </Link>
        </div>

        <div className="bg-navy p-10 md:p-12 rounded-sm">
          <h3 className="font-display text-ivory text-2xl mb-3">
            Un projet en tête ?
          </h3>
          <p className="text-ivory/65 text-sm mb-8">
            Écrivez-nous directement — réponse sous 24h ouvrées, ou
            immédiatement sur WhatsApp.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={whatsappGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold text-navy text-center font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
            >
              Écrire sur WhatsApp
            </a>
            <Link
              href="/contact"
              className="border border-ivory/30 text-ivory text-center text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:border-gold hover:text-gold transition-colors"
            >
              Formulaire de contact
            </Link>
            <a
              href={`tel:${siteConfig.contact.phones[0]}`}
              className="text-ivory/50 text-center text-xs font-mono mt-1"
            >
              {siteConfig.contact.phones[0]}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
