import { translations, type Language, isLanguage } from "@/locales";

export type { Language } from "@/locales";

export const defaultLanguage: Language = "fr";
export const supportedLanguages: Language[] = ["fr", "en", "ar", "es", "it"];
export const localeCookie = "casa-habitat-language";
export const localeHeader = "x-casa-habitat-locale";

export function getLocaleFromPath(pathname: string): Language | null {
  const first = pathname.split("/")[1];
  return isLanguage(first) ? first : null;
}

export function stripLocaleFromPath(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function prefixLocale(pathname: string, locale: Language): string {
  const clean = stripLocaleFromPath(pathname);
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export function getPreferredLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null
): Language {
  if (cookieValue && isLanguage(cookieValue)) return cookieValue;

  if (acceptLanguage) {
    const candidates = acceptLanguage
      .toLowerCase()
      .split(",")
      .map((part) => part.split(";")[0].trim());

    for (const candidate of candidates) {
      const exact = supportedLanguages.find((lang) => candidate === lang);
      if (exact) return exact;
      const base = candidate.split("-")[0];
      const match = supportedLanguages.find((lang) => base === lang);
      if (match) return match;
    }
  }

  return defaultLanguage;
}

export function getTranslation(locale: Language) {
  return translations[locale];
}
