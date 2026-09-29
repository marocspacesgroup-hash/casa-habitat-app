import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getLocaleFromPath,
  getPreferredLocale,
  localeCookie,
  localeHeader,
  stripLocaleFromPath,
} from "@/lib/i18n/config";

/**
 * Point d'entrée de l'intercepteur de requêtes.
 *
 * Next.js 16 lit `src/proxy.ts` et appelle l'export `proxy`. L'ancienne
 * convention — `middleware.ts` exportant `middleware` — n'est plus exécutée :
 * le fichier était bien compilé et inscrit au manifeste, mais son gestionnaire
 * n'était jamais invoqué. Conséquence mesurée : aucune redirection, aucune
 * réécriture, aucun cookie posé, et les cinq URL localisées en 404.
 *
 * Les routes publiques de cette lignée vivent sous `src/app/(public)/…`, sans
 * segment de locale. Une URL `/en/a-propos` n'a donc pas de route propre : elle
 * doit être **réécrite** vers `/a-propos`, la locale étant transmise au rendu
 * par l'en-tête `x-casa-habitat-locale`.
 */

/** Chemins qui ne portent jamais de locale et gardent leur comportement. */
const TECHNICAL_PREFIXES = ["/_next", "/sitemap.xml", "/robots.txt", "/favicon.ico"];

/** Chemins d'authentification et d'API : session rafraîchie, aucune locale. */
const SESSION_PREFIXES = ["/admin", "/api"];

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Étape A — ressources techniques : ni locale, ni session.
  if (TECHNICAL_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return NextResponse.next();
  }

  // Étape B — administration et API : comportement d'authentification inchangé.
  // Le rafraîchissement de session reste cantonné ici, comme sur la lignée
  // `i18n/c1-secured` : une page publique n'a pas besoin de session, et l'y
  // appeler ferait dépendre tout le site public de la disponibilité de Supabase.
  if (SESSION_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return updateSession(request);
  }

  const locale = getLocaleFromPath(pathname);

  // Étape C — chemin sans préfixe de locale : redirection vers la langue
  // préférée. Priorité au choix explicite déjà stocké, puis à `Accept-Language`,
  // puis à `fr`. `Cache-Control: no-store` évite qu'un cache partagé fige la
  // langue du premier visiteur pour tous les suivants.
  if (!locale) {
    const preferred = getPreferredLocale(
      request.cookies.get(localeCookie)?.value,
      request.headers.get("accept-language")
    );
    const target = request.nextUrl.clone();
    target.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;

    const redirect = NextResponse.redirect(target, 307);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  // Étape D — chemin préfixé : réécriture vers la route interne.
  //
  // La locale est transmise par un en-tête de requête **reconstruit**. Muter
  // `request.headers` ne suffit pas : l'objet est immuable en interception, et
  // la mutation ne traverse pas jusqu'au rendu. Seule l'option `request` de
  // `NextResponse.rewrite` propage réellement des en-têtes, ce qui permet à
  // `getServerLocale()` et aux deux layouts de lire la locale de la requête
  // **courante**, sans dépendre du cookie posé par la réponse précédente.
  const target = request.nextUrl.clone();
  target.pathname = stripLocaleFromPath(pathname);

  const headers = new Headers(request.headers);
  headers.set(localeHeader, locale);

  const response = NextResponse.rewrite(target, { request: { headers } });

  // Le cookie mémorise le dernier choix pour les arrivées ultérieures sur une
  // URL sans préfixe. Il ne sert jamais à résoudre la locale de cette requête.
  response.cookies.set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
