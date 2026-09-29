"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { translations, type Language } from "@/locales";
import { getLocaleFromPath } from "@/lib/i18n/config";

export function useTranslation() {
  const pathname = usePathname();
  const language: Language = getLocaleFromPath(pathname) ?? "fr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return { language, translation: translations[language] };
}
