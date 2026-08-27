"use client";

import { startTransition, useEffect, useState } from "react";
import { isLanguage, translations, type Language } from "@/locales";

const STORAGE_KEY = "casa-habitat-language";

export function useTranslation() {
  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(savedLanguage)) startTransition(() => setLanguage(savedLanguage));

    const onLanguageChange = (event: Event) => {
      const nextLanguage = (event as CustomEvent<string>).detail;
      if (isLanguage(nextLanguage)) startTransition(() => setLanguage(nextLanguage));
    };
    window.addEventListener("casa-habitat-language-change", onLanguageChange);
    return () => window.removeEventListener("casa-habitat-language-change", onLanguageChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return { language, translation: translations[language] };
}