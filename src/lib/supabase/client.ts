import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur. Utilise uniquement la clé publique
 * (anon), limitée par les politiques RLS déjà validées côté base.
 * N'importe jamais ce fichier depuis un composant serveur — voir server.ts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
