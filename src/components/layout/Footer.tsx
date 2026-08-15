import Link from "next/link";
import { footerLinks, siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer className="bg-navy-deep border-t border-gold/15 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap justify-between gap-12 pb-12">
          <div className="max-w-xs">
            <div className="font-display text-ivory text-xl">
              CASA <em className="text-gold not-italic italic">Habitat</em>
            </div>
            <p className="text-ivory/50 text-sm mt-3">
              {siteConfig.tagline} — {siteConfig.description}
            </p>
          </div>

          <div className="flex gap-16 flex-wrap">
            <div>
              <div className="eyebrow text-gold mb-4">Agence</div>
              <ul className="space-y-2">
                {footerLinks.agence.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-ivory/60 text-sm hover:text-gold transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="eyebrow text-gold mb-4">Contact</div>
              <ul className="space-y-2 text-ivory/60 text-sm">
                {siteConfig.contact.phones.map((p) => (
                  <li key={p}>
                    <a href={`tel:${p}`} className="hover:text-gold transition-colors">
                      {p}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="hover:text-gold transition-colors"
                  >
                    {siteConfig.contact.email}
                  </a>
                </li>
                <li>
                  {siteConfig.contact.address.line1}, {siteConfig.contact.address.city}
                </li>
              </ul>
            </div>

            <div>
              <div className="eyebrow text-gold mb-4">Légal</div>
              <ul className="space-y-2">
                {footerLinks.legal.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-ivory/60 text-sm hover:text-gold transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-gold/15 pt-6 text-[11px] font-mono text-ivory/40">
          <span>
            © {new Date().getFullYear()} {siteConfig.name} — Tous droits réservés
          </span>
          <span>{siteConfig.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
