import { ar } from "./ar";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export const translations = { fr, en, ar, es, it } as const;
export type Language = keyof typeof translations;

export const languageFlags: Record<Language, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇲🇦",
  es: "🇪🇸",
  it: "🇮🇹",
};

export const languageNames: Record<Language, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  es: "Español",
  it: "Italiano",
};

export function isLanguage(value: string | null): value is Language {
  return value === "fr" || value === "en" || value === "ar" || value === "es" || value === "it";
}