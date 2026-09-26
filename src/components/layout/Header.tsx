"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navLinks, ownerNavLink, siteConfig } from "@/config/site";
import { ar } from "@/locales/ar";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";
import { es } from "@/locales/es";
import { it } from "@/locales/it";
import { getLocaleFromPath, prefixLocale, type Language } from "@/lib/i18n/config";
import { translations as localeTranslations, languageFlags as localeFlags, languageNames as localeNames } from "@/locales";

const translations = localeTranslations;
const languageFlags = localeFlags;

const languageNames = localeNames;

function getNextLanguage(language: Language): Language {
  const languages: Language[] = ["fr", "en", "ar", "es", "it"];
  return languages[(languages.indexOf(language) + 1) % languages.length];
}

const navigationLabels: Record<Language, Record<string, string>> = {
  fr: {
    "/locations": fr.nav.rentals,
    "/vente": fr.nav.sales,
    "/courte-duree": fr.nav.shortStay,
    "/quartiers": fr.nav.neighborhoods,
    "/a-propos": fr.nav.about,
    "/contact": fr.nav.contact,
  },
  en: {
    "/locations": en.nav.rentals,
    "/vente": en.nav.sales,
    "/courte-duree": en.nav.shortStay,
    "/quartiers": en.nav.neighborhoods,
    "/a-propos": en.nav.about,
    "/contact": en.nav.contact,
  },
  ar: {
    "/locations": ar.nav.rentals,
    "/vente": ar.nav.sales,
    "/courte-duree": ar.nav.shortStay,
    "/quartiers": ar.nav.neighborhoods,
    "/a-propos": ar.nav.about,
    "/contact": ar.nav.contact,
  },
  es: {
    "/locations": es.nav.rentals,
    "/vente": es.nav.sales,
    "/courte-duree": es.nav.shortStay,
    "/quartiers": es.nav.neighborhoods,
    "/a-propos": es.nav.about,
    "/contact": es.nav.contact,
  },
  it: {
    "/locations": it.nav.rentals,
    "/vente": it.nav.sales,
    "/courte-duree": it.nav.shortStay,
    "/quartiers": it.nav.neighborhoods,
    "/a-propos": it.nav.about,
    "/contact": it.nav.contact,
  },
};

function localHref(pathname: string, locale: Language): string {
  return prefixLocale(pathname, locale);
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const language: Language = getLocaleFromPath(pathname) ?? "fr";

  const switchLanguage = () => {
    const nextLanguage = getNextLanguage(language);
    document.cookie = `casa-habitat-language=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.push(localHref(pathname, nextLanguage));
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentLocale = translations[language];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-navy/95 backdrop-blur border-b border-gold/20 transition-[padding] duration-500 ${scrolled ? "py-3" : "py-5"}`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href={localHref("/", language)} className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full border border-gold flex items-center justify-center font-display text-gold text-sm">CH</span>
          <span className="font-display text-ivory text-[17px] tracking-wide">
            CASA <em className="text-gold not-italic font-normal italic">Habitat</em>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={localHref(link.href, language)} className="text-[13px] font-medium text-ivory/85 hover:text-gold transition-colors">
              {navigationLabels[language][link.href] ?? link.label}
            </Link>
          ))}
          <Link href={localHref(ownerNavLink.href, language)} className="border border-gold text-gold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm hover:bg-gold hover:text-navy transition-colors">
            {currentLocale.nav.listProperty}
          </Link>
          <button type="button" onClick={switchLanguage} className="border border-ivory/40 text-ivory text-xs uppercase tracking-wider px-3 py-2.5 rounded-sm hover:border-gold hover:text-gold transition-colors" aria-label={`Switch to ${languageNames[getNextLanguage(language)]}`}>
            <span aria-hidden="true">{languageFlags[language]}</span> {language.toUpperCase()}
          </button>
        </nav>

        <button className="lg:hidden text-ivory" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((v) => !v)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-navy border-t border-gold/20 px-6 py-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <Link key={link.href} href={localHref(link.href, language)} onClick={() => setMobileOpen(false)} className="text-ivory/90 text-sm">
              {navigationLabels[language][link.href] ?? link.label}
            </Link>
          ))}
          <Link href={localHref(ownerNavLink.href, language)} onClick={() => setMobileOpen(false)} className="text-gold text-sm font-medium">
            {currentLocale.nav.listProperty} →
          </Link>
          <button type="button" onClick={switchLanguage} className="text-gold text-sm font-medium text-left" aria-label={`Switch to ${languageNames[getNextLanguage(language)]}`}>
            <span aria-hidden="true">{languageFlags[language]}</span> {language.toUpperCase()}
          </button>
          <a href={`tel:${siteConfig.contact.phones[0]}`} className="text-ivory/60 text-xs font-mono">{siteConfig.contact.phones[0]}</a>
        </div>
      )}
    </header>
  );
}
