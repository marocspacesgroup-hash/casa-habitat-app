"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { navLinks, ownerNavLink, siteConfig } from "@/config/site";
import { ar } from "@/locales/ar";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";
import { es } from "@/locales/es";
import { it } from "@/locales/it";

const translations = { fr, en, ar, es, it } as const;
type Language = keyof typeof translations;

const languageNames: Record<Language, string> = {
  fr: fr.language,
  en: en.language,
  ar: ar.language,
  es: es.language,
  it: it.language,
};

function getNextLanguage(language: Language): Language {
  const languages: Language[] = ["fr", "en", "ar", "es", "it"];
  return languages[(languages.indexOf(language) + 1) % languages.length];
}

const navigationLabels: Record<Language, Record<string, string>> = {
  fr: {
    "/locations": fr.navigation.locations,
    "/vente": fr.navigation.sale,
    "/courte-duree": fr.navigation.shortTerm,
    "/quartiers": fr.navigation.neighborhoods,
    "/a-propos": fr.navigation.about,
    "/contact": fr.navigation.contact,
  },
  en: {
    "/locations": en.navigation.locations,
    "/vente": en.navigation.sale,
    "/courte-duree": en.navigation.shortTerm,
    "/quartiers": en.navigation.neighborhoods,
    "/a-propos": en.navigation.about,
    "/contact": en.navigation.contact,
  },
  ar: {
    "/locations": ar.navigation.locations,
    "/vente": ar.navigation.sale,
    "/courte-duree": ar.navigation.shortTerm,
    "/quartiers": ar.navigation.neighborhoods,
    "/a-propos": ar.navigation.about,
    "/contact": ar.navigation.contact,
  },
  es: {
    "/locations": es.navigation.locations,
    "/vente": es.navigation.sale,
    "/courte-duree": es.navigation.shortTerm,
    "/quartiers": es.navigation.neighborhoods,
    "/a-propos": es.navigation.about,
    "/contact": es.navigation.contact,
  },
  it: {
    "/locations": it.navigation.locations,
    "/vente": it.navigation.sale,
    "/courte-duree": it.navigation.shortTerm,
    "/quartiers": it.navigation.neighborhoods,
    "/a-propos": it.navigation.about,
    "/contact": it.navigation.contact,
  },
};

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("fr");

  const currentLocale = translations[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("casa-habitat-language");
    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "ar" ||
      savedLanguage === "es" ||
      savedLanguage === "it"
    ) {
      startTransition(() => setLanguage(savedLanguage));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const toggleLanguage = () => {
    const nextLanguage = getNextLanguage(language);
    setLanguage(nextLanguage);
    window.localStorage.setItem("casa-habitat-language", nextLanguage);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-navy/95 backdrop-blur border-b border-gold/20 transition-[padding] duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full border border-gold flex items-center justify-center font-display text-gold text-sm">
            CH
          </span>
          <span className="font-display text-ivory text-[17px] tracking-wide">
            CASA <em className="text-gold not-italic font-normal italic">Habitat</em>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-ivory/85 hover:text-gold transition-colors"
            >
              {navigationLabels[language][link.href] ?? link.label}
            </Link>
          ))}
          <Link
            href={ownerNavLink.href}
            className="border border-gold text-gold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm hover:bg-gold hover:text-navy transition-colors"
          >
            {currentLocale.navigation.owners}
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="border border-ivory/40 text-ivory text-xs uppercase tracking-wider px-3 py-2.5 rounded-sm hover:border-gold hover:text-gold transition-colors"
            aria-label={`Switch to ${languageNames[getNextLanguage(language)]}`}
          >
            {translations[getNextLanguage(language)].languageShort}
          </button>
        </nav>

        <button
          className="lg:hidden text-ivory"
          aria-label={mobileOpen ? currentLocale.navigation.closeMenu : currentLocale.navigation.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-navy border-t border-gold/20 px-6 py-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-ivory/90 text-sm"
            >
              {navigationLabels[language][link.href] ?? link.label}
            </Link>
          ))}
          <Link
            href={ownerNavLink.href}
            onClick={() => setMobileOpen(false)}
            className="text-gold text-sm font-medium"
          >
            {currentLocale.navigation.owners} →
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="text-gold text-sm font-medium text-left"
            aria-label={`Switch to ${languageNames[getNextLanguage(language)]}`}
          >
            {translations[getNextLanguage(language)].languageShort}
          </button>
          <a
            href={`tel:${siteConfig.contact.phones[0]}`}
            className="text-ivory/60 text-xs font-mono"
          >
            {siteConfig.contact.phones[0]}
          </a>
        </div>
      )}
    </header>
  );
}
