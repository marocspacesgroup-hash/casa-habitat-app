import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applyI18n } from "@/middleware-i18n";
import { localeCookie, localeHeader } from "@/lib/i18n/config";

export async function middleware(request: NextRequest) {
  const redirect = applyI18n(request);
  if (redirect) return redirect;

  const response = await updateSession(request);
  const locale = request.headers.get(localeHeader);

  // Pour une URL localisée (/fr/..., /en/..., /ar/...), le middleware
  // doit effectuer un rewrite HTTP réel vers la route publique existante
  // (/..., sans le préfixe de langue). Modifier uniquement nextUrl ne
  // suffit pas : Next.js continuerait à chercher une page /fr/... et
  // retournerait 404.
  if (locale) {
    if (response.status !== 200) return response;

    const rewriteUrl = request.nextUrl.clone();
    const rewrittenResponse = NextResponse.rewrite(rewriteUrl);

    response.cookies.getAll().forEach((cookie) => {
      rewrittenResponse.cookies.set(cookie);
    });

    rewrittenResponse.cookies.set(localeCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return rewrittenResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
