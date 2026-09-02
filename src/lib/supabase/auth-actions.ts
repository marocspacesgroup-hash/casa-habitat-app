"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-mail et mot de passe requis." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // === DIAGNOSTIC TEMPORAIRE — À RETIRER UNE FOIS LA CAUSE IDENTIFIÉE ===
  if (error || !data.user) {
    console.error("[DIAGNOSTIC LOGIN] Erreur Supabase réelle :", error);
    return {
      error: `Diagnostic : ${error?.name ?? "erreur inconnue"} — ${error?.message ?? "aucun utilisateur retourné"}`,
    };
  }
  // === FIN DIAGNOSTIC TEMPORAIRE ===

  // Vérifie que ce compte authentifié est bien l'administrateur, pas
  // seulement un compte Supabase valide.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas accès à l'administration." };
  }

  redirect("/admin/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
