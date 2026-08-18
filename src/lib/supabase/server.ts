import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase côté serveur, lié aux cookies de session de la requête
 * en cours. Toute lecture/écriture passe par ce client dans les Server
 * Components et Server Actions — les politiques RLS s'appliquent avec
 * l'identité réelle de l'utilisateur (anonyme ou admin authentifié).
 *
 * N'utilise PAS la clé service_role : ce client reste soumis aux RLS,
 * ce qui est le comportement voulu — voir les échanges sur l'architecture
 * de sécurité.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignoré sans risque si le
            // middleware gère déjà le rafraîchissement de session.
          }
        },
      },
    }
  );
}
