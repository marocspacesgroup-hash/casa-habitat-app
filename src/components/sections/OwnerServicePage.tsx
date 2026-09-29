import Link from "next/link";
import { prefixLocale, type Language } from "@/lib/i18n/config";
import { siteConfig } from "@/config/site";
import { whatsappOwner } from "@/lib/whatsapp";
import TrackedLink from "@/components/ui/TrackedLink";
import type { OwnerServiceContent } from "@/lib/i18n/owner-services";

export default function OwnerServicePage({ locale, content }: { locale: Language; content: OwnerServiceContent }) {
  return <div className="pt-32 pb-24">
    <section className="bg-navy py-20 mb-16"><div className="max-w-4xl mx-auto px-6">
      <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-6 bg-gold text-navy">{content.eyebrow}</span>
      <h1 className="font-display text-ivory text-[clamp(30px,4.5vw,52px)] leading-tight mb-6">{content.title} <em className="text-gold not-italic italic">{content.emphasis}</em></h1>
      <p className="text-ivory/75 text-base md:text-lg max-w-3xl leading-8">{content.intro}</p>
    </div></section>
    <div className="max-w-5xl mx-auto px-6"><div className="grid lg:grid-cols-[1fr_300px] gap-14">
      <article className="space-y-12">
        {content.sections.map((section,index)=><section key={section.title}><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{String(index+1).padStart(2,"0")}</span><h2 className="font-display text-2xl md:text-3xl text-ink mt-2 mb-4">{section.title}</h2><p className="text-ink-soft leading-8">{section.body}</p></section>)}
        <section className="border-t border-ink/10 pt-10"><h2 className="font-display text-2xl text-ink mb-5">{content.nextTitle}</h2><div className="flex flex-wrap gap-3">
          {content.links.map(link=><Link key={link.href} href={prefixLocale(link.href,locale)} className="border border-ink/15 px-4 py-3 text-sm text-ink hover:border-gold hover:text-navy transition-colors rounded-sm">{link.label}</Link>)}
        </div></section>
      </article>
      <aside className="bg-navy rounded-sm p-7 h-fit lg:sticky lg:top-28"><h2 className="text-ivory text-xl font-medium mb-3">{content.ctaTitle}</h2><p className="text-ivory/65 text-sm leading-6 mb-6">{content.ctaText}</p>
        <div className="flex flex-col gap-3">
          <TrackedLink href={prefixLocale("/estimation",locale)} event="owner_cta_click" params={{source:content.slug,channel:"estimation"}} className="bg-gold text-navy text-center font-semibold text-xs uppercase tracking-widest px-5 py-3.5 rounded-sm hover:bg-gold-bright transition-colors">{content.ctaPrimary}</TrackedLink>
          <TrackedLink href={whatsappOwner()} target="_blank" rel="noopener noreferrer" event="owner_cta_click" params={{source:content.slug,channel:"whatsapp"}} className="border border-ivory/30 text-ivory text-center text-xs uppercase tracking-widest px-5 py-3.5 rounded-sm hover:border-gold hover:text-gold transition-colors">{content.ctaWhatsapp}</TrackedLink>
          <a href={`tel:${siteConfig.contact.phones[0]}`} className="text-ivory/60 text-center text-xs font-mono hover:text-gold transition-colors">{siteConfig.contact.phones[0]}</a>
        </div>
      </aside>
    </div></div>
  </div>;
}
