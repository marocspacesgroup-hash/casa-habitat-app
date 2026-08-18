import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de Casa Habitat.",
  alternates: { canonical: "/mentions-legales" },
};

function LegalField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      {label} : {value || <span className="italic text-ink-soft/70">à renseigner</span>}
    </p>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Informations légales
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,38px)] text-ink mb-10">
          Mentions légales
        </h1>

        <div className="flex flex-col gap-10 text-ink-soft leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-ink mb-3">Éditeur du site</h2>
            <p>
              {siteConfig.name} — {siteConfig.tagline}
              <br />
              {siteConfig.contact.address.line1}, {siteConfig.contact.address.city}, {siteConfig.contact.address.country}
              <br />
              E-mail : {siteConfig.contact.email}
              <br />
              Téléphone : {siteConfig.contact.phones.join(" · ")}
              <br />
              Responsable de la publication : Charles Konan
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">
              Identification professionnelle
            </h2>
            <div className="flex flex-col gap-1 text-sm">
              <LegalField label="Forme juridique" value={siteConfig.legal.formeJuridique} />
              <LegalField label="Registre du commerce (RC)" value={siteConfig.legal.rc} />
              <LegalField label="Identifiant commun de l'entreprise (ICE)" value={siteConfig.legal.ice} />
              <LegalField label="Carte professionnelle d'agent immobilier" value={siteConfig.legal.carteProfessionnelle} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">Hébergement</h2>
            <p>
              {siteConfig.hosting.name}
              <br />
              {siteConfig.hosting.website}
              <br />
              Informations légales de l&apos;hébergeur :{" "}
              <a
                href={siteConfig.hosting.legalInfo}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-gold"
              >
                {siteConfig.hosting.legalInfo}
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">
              Propriété intellectuelle
            </h2>
            <p>
              L&apos;ensemble des contenus présents sur ce site (textes,
              photographies, logo, identité visuelle) est la propriété de{" "}
              {siteConfig.name}, sauf mention contraire, et ne peut être
              reproduit sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">
              Annonces immobilières
            </h2>
            <p>
              Les informations relatives aux biens (prix, surface,
              caractéristiques) sont communiquées à titre indicatif et
              peuvent évoluer. Elles sont vérifiées régulièrement mais ne
              sauraient engager la responsabilité de {siteConfig.name} en
              cas d&apos;erreur ou de modification.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
