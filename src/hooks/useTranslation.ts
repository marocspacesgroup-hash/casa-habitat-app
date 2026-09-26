"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isLanguage, translations, type Language } from "@/locales";
import { getLocaleFromPath } from "@/lib/i18n/config";

const STORAGE_KEY = "casa-habitat-language";

export function useTranslation() {
  const pathname = usePathname();
  const routeLocale = getLocaleFromPath(pathname);
  const [language, setLanguage] = useState<Language>(routeLocale ?? "fr");

  useEffect(() => {
    const pathLocale = getLocaleFromPath(window.location.pathname);
    if (pathLocale) {
      startTransition(() => setLanguage(pathLocale));
    } else {
      const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguage(savedLanguage)) startTransition(() => setLanguage(savedLanguage));
    }

    const onLanguageChange = (event: Event) => {
      const nextLanguage = (event as CustomEvent<string>).detail;
      if (isLanguage(nextLanguage)) startTransition(() => setLanguage(nextLanguage));
    };
    window.addEventListener("casa-habitat-language-change", onLanguageChange);
    return () => window.removeEventListener("casa-habitat-language-change", onLanguageChange);
  }, []);

  useEffect(() => {
    if (routeLocale && routeLocale !== language) {
      startTransition(() => setLanguage(routeLocale));
    }
  }, [routeLocale, language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return { language, translation: translations[language] };
}
