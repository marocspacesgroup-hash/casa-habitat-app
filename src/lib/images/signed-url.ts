import { createClient } from "@/lib/supabase/server";

const BUCKET = "listing-photos";
/** 24h : largement supérieur à la fenêtre de cache des pages (revalidation
 * à la demande à chaque modification admin, ou toutes les heures en secours) */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

/**
 * Génère une URL signée pour une photo. S'appuie sur la politique RLS
 * "public_read_published_listing_photos" : si le bien n'est pas publié,
 * la génération échoue silencieusement (retourne null) — jamais de fuite
 * de photo de brouillon, la base elle-même refuse.
 */
export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

/** Génère plusieurs URLs signées en parallèle (galerie d'un bien). */
export async function getSignedPhotoUrls(
  storagePaths: string[]
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const results = new Map<string, string>();
  if (storagePaths.length === 0) return results;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return results;

  for (const item of data) {
    if (item.signedUrl && item.path) {
      results.set(item.path, item.signedUrl);
    }
  }
  return results;
}

/**
 * Client Storage utilisé par l'admin (upload/suppression) — mêmes
 * politiques RLS, mais l'utilisateur authentifié admin a accès complet
 * via is_admin(), donc pas besoin d'URL signée pour ses propres écritures.
 */
export async function uploadListingPhoto(
  reference: string,
  fileName: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const supabase = await createClient();
  const path = `${reference}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return { error: error.message };
  return { path };
}

export async function deleteListingPhoto(storagePath: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) return { error: error.message };
  return { success: true };
}
