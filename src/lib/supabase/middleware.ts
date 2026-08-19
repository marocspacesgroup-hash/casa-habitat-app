import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque requête et protège /admin.
 *
 * Un utilisateur authentifié n'est PAS automatiquement administrateur —
 * la présence d'une session ne suffit jamais : chaque décision de
 * redirection ci-dessous vérifie explicitement is_admin() (la liste
 * blanche en base), en plus de la vérification déjà faite indépendamment
 * dans admin/layout.tsx et chaque server action (défense en profondeur,
 * pas une simple délégation à ce middleware).
 *
 * Sans ce contrôle explicite ici, un compte authentifié mais absent de la
 * table admins provoquait une boucle : /admin/login le renvoyait vers
 * /admin/dashboard (session présente), qui le renvoyait vers /admin/login
 * (non admin) — indéfiniment.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";

  // Aucune session : jamais admin, inutile d'appeler is_admin().
  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Une session existe : ne JAMAIS la traiter comme admin sans vérifier.
  let isAdmin = false;
  if (user && isAdminRoute) {
    const { data } = await supabase.rpc("is_admin");
    isAdmin = data === true;
  }

  // Connecté mais pas admin, sur une page protégée : retour au login —
  // une seule fois, pas de boucle, puisque la règle suivante ne renvoie
  // vers le dashboard que si isAdmin est vrai.
  if (isAdminRoute && !isLoginRoute && user && !isAdmin) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "not_admin");
    return NextResponse.redirect(loginUrl);
  }

  // Sur /admin/login : ne redirige vers le dashboard QUE si réellement admin.
  // Un compte authentifié non-admin reste sur /admin/login sans boucler —
  // il peut s'y reconnecter avec un autre compte.
  if (isLoginRoute && user && isAdmin) {
    const dashboardUrl = new URL("/admin/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
