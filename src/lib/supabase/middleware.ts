import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque requête et protège /admin.
 * Un utilisateur non connecté qui tente d'accéder à une page /admin
 * (hors /admin/login) est redirigé vers /admin/login — vérification
 * côté serveur, jamais laissée au seul état React côté client.
 *
 * Ce middleware vérifie uniquement qu'une session existe. La vérification
 * is_admin() (liste blanche) est faite séparément dans admin/layout.tsx
 * et dans chaque server action — défense en profondeur.
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

  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    const dashboardUrl = new URL("/admin/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
