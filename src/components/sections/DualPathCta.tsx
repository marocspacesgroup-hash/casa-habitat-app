import Link from "next/link";
import { getServerTranslation } from "@/lib/i18n/server";
import { prefixLocale } from "@/lib/i18n/config";
export default async function DualPathCta() {
  const { translation, locale } = await getServerTranslation();
  const t=translation.home;
  return <section className="border-b border-ink/10"><div className="grid md:grid-cols-2">
    <Link href={prefixLocale("/locations", locale)} className="group px-8 py-16 md:py-20 border-b md:border-b-0 md:border-r border-ink/10 hover:bg-navy transition-colors">
      <span className="eyebrow text-gold">{t.looking}</span><h2 className="font-display text-2xl md:text-[28px] text-ink group-hover:text-ivory mt-3 mb-3 transition-colors">{t.lookingTitle}</h2><p className="text-ink-soft group-hover:text-ivory/70 text-sm mb-6 max-w-sm transition-colors">{t.lookingText}</p><span className="text-sm font-semibold text-navy group-hover:text-gold border-b border-gold pb-1 transition-colors">{t.lookingCta}</span>
    </Link>
    <Link href={prefixLocale("/confier-mon-bien", locale)} className="group px-8 py-16 md:py-20 hover:bg-navy transition-colors">
      <span className="eyebrow text-gold">{t.owner}</span><h2 className="font-display text-2xl md:text-[28px] text-ink group-hover:text-ivory mt-3 mb-3 transition-colors">{t.ownerTitle}</h2><p className="text-ink-soft group-hover:text-ivory/70 text-sm mb-6 max-w-sm transition-colors">{t.ownerText}</p><span className="text-sm font-semibold text-navy group-hover:text-gold border-b border-gold pb-1 transition-colors">{t.ownerCta}</span>
    </Link>
  </div></section>;
}