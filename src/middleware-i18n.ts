import { NextResponse, type NextRequest } from "next/server";
import {
  getLocaleFromPath,
  getPreferredLocale,
  localeCookie,
  localeHeader,
  stripLocaleFromPath,
} from "@/lib/i18n/config";

const PUBLIC_PREFIXES = ["/admin", "/api", "/_next", "/sitemap.xml", "/robots.txt"];

export function applyI18n(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  const locale = getLocaleFromPath(pathname);
  if (!locale) {
    const preferred = getPreferredLocale(
      request.cookies.get(localeCookie)?.value,
      request.headers.get("accept-language")
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const cleanPath = stripLocaleFromPath(pathname);
  request.nextUrl.pathname = cleanPath;
  request.headers.set(localeHeader, locale);

  return null;
}
