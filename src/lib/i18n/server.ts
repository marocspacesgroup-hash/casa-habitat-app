import { headers } from "next/headers";
import { getPreferredLocale, getLocaleFromPath, getTranslation, type Language } from "./config";

export async function getServerLocale(): Promise<Language> {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get("x-casa-habitat-locale");
  if (localeHeader && getLocaleFromPath(`/${localeHeader}`)) {
    return localeHeader as Language;
  }

  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("casa-habitat-language="))
    ?.split("=")[1];

  return getPreferredLocale(cookieValue, requestHeaders.get("accept-language"));
}

export async function getServerTranslation() {
  const locale = await getServerLocale();
  return { locale, translation: getTranslation(locale) };
}
