"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { revalidateListingPaths } from "@/lib/supabase/revalidate";

/**
 * Les photos peuvent changer sur un bien déjà publié : chaque action
 * revalide donc aussi la fiche publique correspondante, pas seulement
 * la page d'édition admin — sinon une photo modifiée sur un bien publié
 * resterait périmée sur le site public jusqu'à la prochaine modification.
 */
async function revalidateForListing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string
) {
  const { data } = await supabase
    .from("listings")
    .select("slug, quartier_slug")
    .eq("id", listingId)
    .maybeSingle();

  revalidateListingPaths({
    slug: data?.slug,
    quartierSlug: data?.quartier_slug,
  });
  revalidatePath(`/admin/listings/${listingId}/edit`);
}

export interface PhotoUploadTarget {
  path: string;
  position: number;
  mimeType: string;
}

export async function preparePhotoUploads(
  listingId: string,
  files: { extension: string; mimeType: string }[]
): Promise<{ targets?: PhotoUploadTarget[]; error?: string }> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };
  if (files.length === 0) return { error: "Aucune photo sélectionnée." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("reference")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { error: "Bien introuvable." };

  const { data: existingImages } = await supabase
    .from("listing_images")
    .select("position")
    .eq("listing_id", listingId)
    .order("position", { ascending: false })
    .limit(1);

  let nextPosition = (existingImages?.[0]?.position ?? -1) + 1;
  const targets: PhotoUploadTarget[] = [];

  for (const file of files) {
    const extension = file.extension.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!file.mimeType.startsWith("image/") || !extension) continue;

    targets.push({
      path: `${listing.reference}/${String(nextPosition + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extension}`,
      position: nextPosition,
      mimeType: file.mimeType,
    });
    nextPosition += 1;
  }

  if (targets.length === 0) return { error: "Aucune image valide sélectionnée." };
  return { targets };
}

export async function registerPhoto(
  listingId: string,
  storagePath: string,
  position: number,
  mimeType: string
): Promise<{ error?: string; success?: boolean }> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("reference")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { error: "Bien introuvable." };
  if (!storagePath.startsWith(`${listing.reference}/`)) {
    return { error: "Chemin de photo invalide." };
  }
  if (!mimeType.startsWith("image/") || !Number.isInteger(position) || position < 0) {
    return { error: "Métadonnées de photo invalides." };
  }

  const { error: insertError } = await supabase.from("listing_images").insert({
    listing_id: listingId,
    storage_path: storagePath,
    position,
    is_primary: position === 0,
  });

  if (insertError) {
    const { data: existingImage } = await supabase
      .from("listing_images")
      .select("id")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (!existingImage) {
      await supabase.storage.from("listing-photos").remove([storagePath]);
    }
    return { error: insertError.message };
  }

  await revalidateForListing(supabase, listingId);
  return { success: true };
}

export async function cleanupPhotoUpload(
  listingId: string,
  storagePath: string
): Promise<{ error?: string; success?: boolean }> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("reference")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { error: "Bien introuvable." };
  if (!storagePath.startsWith(`${listing.reference}/`)) {
    return { error: "Chemin de photo invalide." };
  }

  const { data: existingImage } = await supabase
    .from("listing_images")
    .select("id")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existingImage) return { success: true };

  const { error } = await supabase.storage.from("listing-photos").remove([storagePath]);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePhoto(imageId: string, listingId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { data: image } = await supabase
    .from("listing_images")
    .select("storage_path, is_primary")
    .eq("id", imageId)
    .maybeSingle();

  if (!image) return { error: "Photo introuvable." };

  await supabase.storage.from("listing-photos").remove([image.storage_path]);
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  if (image.is_primary) {
    const { data: next } = await supabase
      .from("listing_images")
      .select("id")
      .eq("listing_id", listingId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase.from("listing_images").update({ is_primary: true }).eq("id", next.id);
    }
  }

  await revalidateForListing(supabase, listingId);
  return { success: true };
}

export async function setPrimaryPhoto(imageId: string, listingId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();

  await supabase.from("listing_images").update({ is_primary: false }).eq("listing_id", listingId);
  const { error } = await supabase
    .from("listing_images")
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) return { error: error.message };
  await revalidateForListing(supabase, listingId);
  return { success: true };
}

export async function reorderPhotos(listingId: string, orderedImageIds: string[]) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  await Promise.all(
    orderedImageIds.map((id, index) =>
      supabase.from("listing_images").update({ position: index }).eq("id", id)
    )
  );

  await revalidateForListing(supabase, listingId);
  return { success: true };
}

export async function updatePhotoAlt(imageId: string, listingId: string, alt: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { error } = await supabase.from("listing_images").update({ alt }).eq("id", imageId);
  if (error) return { error: error.message };
  await revalidateForListing(supabase, listingId);
  return { success: true };
}
