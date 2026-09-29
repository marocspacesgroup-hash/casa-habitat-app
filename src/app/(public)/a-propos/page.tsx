import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { whatsappGeneral } from "@/lib/whatsapp";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("about", "/a-propos");
}

export default async function AProposPage() {
  const { translation } = await getServerTranslation();
  const t = translation.pages.about;
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          {t.eyebrow}
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-8">
          {siteConfig.name} — <em className="text-gold not-italic italic">{siteConfig.tagline}</em>
        </h1>

        <p className="text-ink-soft mb-6 leading-relaxed text-[17px]">
          {siteConfig.description}
        </p>
        <p className="text-ink-soft mb-6 leading-relaxed">
          {t.intro}
        </p>
        <p className="text-ink-soft mb-12 leading-relaxed">
          {t.international}
        </p>

        <div className="bg-navy rounded-sm p-8 md:p-10">
          <h2 className="font-display text-ivory text-xl mb-4">
            {t.domains}
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3 text-ivory/75 text-sm mb-8">
            <li>— {t.sale}</li>
            <li>— {t.rent}</li>
            <li>— {t.shortStay}</li>
            <li>— {t.management}</li>
            <li>— {t.investment}</li>
          </ul>
          <a
            href={whatsappGeneral()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
          >
            {t.project}
          </a>
        </div>
      </div>
    </div>
  );
}
