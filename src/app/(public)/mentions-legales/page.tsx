import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  const metadata = await getPageMetadata("legal", "/mentions-legales");
  return metadata;
}

function LegalField({ label, value, emptyLabel }: { label: string; value: string; emptyLabel: string }) {
  return (
    <p>
      {label} : {value || <span className="italic text-ink-soft/70">{emptyLabel}</span>}
    </p>
  );
}

export default async function MentionsLegalesPage() {
  const { translation } = await getServerTranslation();
  const t = translation.pages.legal;
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          {t.eyebrow}
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,38px)] text-ink mb-10">
          Mentions légales
        </h1>

        <div className="flex flex-col gap-10 text-ink-soft leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-ink mb-3">{t.publisher}</h2>
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
              {t.professional}
            </h2>
            <p className="mb-3">
              {siteConfig.name}
              <br />
              Plateforme immobilière exploitée par{" "}
              {siteConfig.legal.denominationSociale} {siteConfig.legal.formeJuridique}
            </p>
            <div className="flex flex-col gap-1 text-sm">
              <LegalField label="Dénomination sociale" value={siteConfig.legal.denominationSociale} emptyLabel={t.toComplete} />
              <LegalField label="Forme juridique" value={siteConfig.legal.formeJuridique} emptyLabel={t.toComplete} />
              <LegalField label="Siège social" value={siteConfig.legal.siegeSocial} emptyLabel={t.toComplete} />
              <LegalField label="Registre du commerce (RC)" value={siteConfig.legal.rc} emptyLabel={t.toComplete} />
              <LegalField label="Identifiant commun de l'entreprise (ICE)" value={siteConfig.legal.ice} emptyLabel={t.toComplete} />
              <LegalField label="Identifiant fiscal (IF)" value={siteConfig.legal.identifiantFiscal} emptyLabel={t.toComplete} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-3">{t.hosting}</h2>
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
              {t.intellectual}
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
              {t.listings}
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
