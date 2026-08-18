import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie côté serveur, à chaque appel, que l'utilisateur connecté est
 * bien l'administrateur (présent dans la table admins via is_admin()).
 * Ne fait JAMAIS confiance à un état côté navigateur. Utilisé dans :
 * - admin/layout.tsx (protection de toutes les pages /admin)
 * - chaque server action de mutation (création, édition, upload, suppression)
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false as const };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || !isAdmin) {
    return { user, isAdmin: false as const };
  }

  return { user, isAdmin: true as const };
}
