import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applyI18n } from "@/middleware-i18n";
import { getLocaleFromPath, localeCookie } from "@/lib/i18n/config";

export async function middleware(request: NextRequest) {
  const redirect = applyI18n(request);
  if (redirect) return redirect;

  const response = await updateSession(request);
  const locale = getLocaleFromPath(request.nextUrl.pathname);
  if (locale) {
    response.cookies.set(localeCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
