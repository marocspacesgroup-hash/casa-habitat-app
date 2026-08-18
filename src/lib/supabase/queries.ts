import { createClient } from "@/lib/supabase/server";
import { adaptListingForPublicSite, adaptListingsForPublicSite } from "./adapter";
import { DbListingWithImages, DbNeighborhood } from "./database.types";
import { Listing, Neighborhood, TransactionType } from "@/data/types";

const LISTING_SELECT = "*, listing_images(*), neighborhoods(nom)";

function toDbTransaction(t: TransactionType) {
  return t === "courte-duree" ? "courte_duree" : t;
}

export async function getPublishedListings(): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("publication_status", "publie")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export async function getPublishedListingsByTransaction(
  transaction: TransactionType
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("transaction", toDbTransaction(transaction))
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export async function getPublishedListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return adaptListingForPublicSite(data as unknown as DbListingWithImages);
}

export async function getPublishedListingsByNeighborhood(
  quartierSlug: string
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("quartier_slug", quartierSlug)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export async function getSimilarPublishedListings(
  listing: Listing,
  max = 3
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("publication_status", "publie")
    .neq("slug", listing.slug)
    .or(`quartier_slug.eq.${listing.quartierSlug},type_bien.eq.${listing.typeBien}`)
    .limit(max);

  if (error || !data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export async function getNeighborhoods(): Promise<Neighborhood[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select("*")
    .order("nom", { ascending: true });

  if (error || !data) return [];
  return (data as DbNeighborhood[]).map((n) => ({
    slug: n.slug,
    nom: n.nom,
    ville: n.ville,
    description: n.description ?? "",
    faits: n.faits,
  }));
}

export async function getNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const n = data as DbNeighborhood;
  return { slug: n.slug, nom: n.nom, ville: n.ville, description: n.description ?? "", faits: n.faits };
}

/** Références de tous les biens publiés — pour generateStaticParams / sitemap. */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("slug")
    .eq("publication_status", "publie");

  if (error || !data) return [];
  return data.map((row) => row.slug as string);
}
