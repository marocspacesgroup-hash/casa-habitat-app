"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { revalidateListingPaths } from "@/lib/supabase/revalidate";
import {
  DbPropertyCondition,
  DbPropertyType,
  DbStandingLevel,
  DbTransactionType,
} from "@/lib/supabase/database.types";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ListingFormState {
  error?: string;
  success?: boolean;
}

function parseListingFormData(formData: FormData) {
  const num = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const bool = (key: string) => formData.get(key) === "on";
  const str = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : String(v);
  };

  return {
    reference: String(formData.get("reference") ?? "").trim(),
    titre: String(formData.get("titre") ?? "").trim(),
    slug: str("slug"),
    description: str("description"),
    transaction: String(formData.get("transaction")) as DbTransactionType,
    type_bien: String(formData.get("type_bien")) as DbPropertyType,
    quartier_slug: String(formData.get("quartier_slug")),
    ville: str("ville") ?? "Casablanca",
    adresse: str("adresse"),
    prix: num("prix"),
    periode_prix: str("periode_prix") as "mois" | "nuit" | null,
    surface_m2: num("surface_m2") ?? 0,
    pieces: num("pieces"),
    chambres: num("chambres") ?? 0,
    salles_de_bain: num("salles_de_bain") ?? 0,
    wc_invites: num("wc_invites"),
    etage: str("etage"),
    ascenseur: bool("ascenseur"),
    parking: bool("parking"),
    meuble: bool("meuble"),
    climatisation: bool("climatisation"),
    chauffage: bool("chauffage"),
    terrasse_balcon: bool("terrasse_balcon"),
    etat: str("etat") as DbPropertyCondition | null,
    standing: (str("standing") ?? "standard") as DbStandingLevel,
    equipements: String(formData.get("equipements") ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    disponibilite: str("disponibilite"),
    charges_incluses: formData.has("charges_incluses") ? bool("charges_incluses") : null,
    caution: str("caution"),
    honoraires_agence: str("honoraires_agence"),
    conditions_particulieres: str("conditions_particulieres"),
    seo_title: str("seo_title"),
    seo_description: str("seo_description"),
    courte_duree_details: (() => {
      const par_semaine = num("courte_duree_par_semaine");
      const par_mois = num("courte_duree_par_mois");
      const voyageurs_max = num("courte_duree_voyageurs_max");
      if (par_semaine === null && par_mois === null && voyageurs_max === null) {
        return null;
      }
      return {
        par_semaine: par_semaine ?? undefined,
        par_mois: par_mois ?? undefined,
        voyageurs_max: voyageurs_max ?? undefined,
      };
    })(),
  };
}

export async function createListing(
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const parsed = parseListingFormData(formData);
  if (!parsed.reference || !parsed.titre || !parsed.quartier_slug || !parsed.surface_m2) {
    return { error: "Référence, titre, quartier et surface sont requis." };
  }

  const slug = parsed.slug || slugify(`${parsed.quartier_slug}-${parsed.titre}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...parsed, slug })
    .select("id")
    .single();

  if (error) {
    return { error: error.message.includes("duplicate") ? "Référence ou slug déjà utilisé." : error.message };
  }

  revalidateListingPaths({ slug, quartierSlug: parsed.quartier_slug });
  redirect(`/admin/listings/${data.id}/edit?created=1`);
}

export async function updateListing(
  id: string,
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const parsed = parseListingFormData(formData);
  const slug = parsed.slug || slugify(`${parsed.quartier_slug}-${parsed.titre}`);

  const supabase = await createClient();

  // Conserve l'ancien slug dans l'historique s'il change, pour permettre
  // une redirection 301 future (slug_history déjà prévu dans le schéma).
  const { data: existing } = await supabase
    .from("listings")
    .select("slug, slug_history")
    .eq("id", id)
    .maybeSingle();

  const slugHistory =
    existing && existing.slug !== slug
      ? Array.from(new Set([...(existing.slug_history ?? []), existing.slug]))
      : existing?.slug_history ?? [];

  const { error } = await supabase
    .from("listings")
    .update({ ...parsed, slug, slug_history: slugHistory })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateListingPaths({ slug, quartierSlug: parsed.quartier_slug });
  if (existing && existing.slug !== slug) {
    revalidatePath(`/biens/${existing.slug}`);
  }
  return { success: true };
}

export async function setPublicationStatus(
  id: string,
  status: "brouillon" | "publie" | "archive"
) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .update({ publication_status: status })
    .eq("id", id)
    .select("slug, quartier_slug, transaction")
    .single();

  if (error) return { error: error.message };
  revalidateListingPaths({ slug: data.slug, quartierSlug: data.quartier_slug });
  return { success: true };
}

export async function setAvailabilityStatus(
  id: string,
  status: "disponible" | "reserve" | "loue" | "vendu"
) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .update({ availability_status: status })
    .eq("id", id)
    .select("slug, quartier_slug, transaction")
    .single();

  if (error) return { error: error.message };
  revalidateListingPaths({ slug: data.slug, quartierSlug: data.quartier_slug });
  return { success: true };
}

/** Suppression définitive — supprime aussi les photos du Storage. Confirmation gérée côté UI. */
export async function deleteListingPermanently(id: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("slug, quartier_slug, transaction, reference, listing_images(storage_path)")
    .eq("id", id)
    .maybeSingle();

  if (!listing) return { error: "Bien introuvable." };

  const paths = (listing.listing_images as { storage_path: string }[]).map((i) => i.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("listing-photos").remove(paths);
  }

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateListingPaths({ slug: listing.slug, quartierSlug: listing.quartier_slug });
  return { success: true };
}
