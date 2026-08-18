import { createClient } from "@/lib/supabase/server";
import { DbListingWithImages } from "./database.types";

export interface AdminListingFilters {
  publicationStatus?: string;
  availabilityStatus?: string;
  search?: string;
}

export async function getAdminListings(
  filters: AdminListingFilters = {}
): Promise<DbListingWithImages[]> {
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select("*, listing_images(*)")
    .order("updated_at", { ascending: false });

  if (filters.publicationStatus) {
    query = query.eq("publication_status", filters.publicationStatus);
  }
  if (filters.availabilityStatus) {
    query = query.eq("availability_status", filters.availabilityStatus);
  }
  if (filters.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,titre.ilike.%${filters.search}%,quartier_slug.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as DbListingWithImages[];
}

export async function getAdminListingById(id: string): Promise<DbListingWithImages | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as DbListingWithImages;
}

export interface DashboardStats {
  total: number;
  publies: number;
  brouillons: number;
  archives: number;
  reserves: number;
  loues: number;
  vendus: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("publication_status, availability_status");

  if (error || !data) {
    return { total: 0, publies: 0, brouillons: 0, archives: 0, reserves: 0, loues: 0, vendus: 0 };
  }

  const rows = data as { publication_status: string; availability_status: string }[];
  return {
    total: rows.length,
    publies: rows.filter((r) => r.publication_status === "publie").length,
    brouillons: rows.filter((r) => r.publication_status === "brouillon").length,
    archives: rows.filter((r) => r.publication_status === "archive").length,
    reserves: rows.filter((r) => r.availability_status === "reserve").length,
    loues: rows.filter((r) => r.availability_status === "loue").length,
    vendus: rows.filter((r) => r.availability_status === "vendu").length,
  };
}
