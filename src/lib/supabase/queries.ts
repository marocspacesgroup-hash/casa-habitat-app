import { createClient } from "@/lib/supabase/server";
import { adaptListingForPublicSite, adaptListingsForPublicSite } from "./adapter";
import { DbListingWithImages, DbNeighborhood } from "./database.types";
import { Listing, Neighborhood, TransactionType } from "@/data/types";
import { CASABLANCA_QUARTIERS, neighborhoods, quartierSlug } from "@/data/neighborhoods";

const PUBLIC_LISTING_SELECT = [
  "id",
  "reference",
  "slug",
  "is_sample",
  "availability_status",
  "transaction",
  "type_bien",
  "titre",
  "description",
  "quartier_slug",
  "ville",
  "prix",
  "periode_prix",
  "surface_m2",
  "pieces",
  "chambres",
  "salles_de_bain",
  "wc_invites",
  "etage",
  "ascenseur",
  "parking",
  "meuble",
  "climatisation",
  "chauffage",
  "terrasse_balcon",
  "etat",
  "standing",
  "equipements",
  "disponibilite",
  "charges_incluses",
  "caution",
  "honoraires_agence",
  "conditions_particulieres",
  "courte_duree_details",
  "updated_at",
  "listing_images(storage_path, alt, position, is_primary)",
  "neighborhoods(nom)",
].join(", ");

const PUBLIC_NEIGHBORHOOD_SELECT =
  "slug, nom, ville, description, faits, latitude, longitude, zoom";

function toDbTransaction(t: TransactionType) {
  return t === "courte-duree" ? "courte_duree" : t;
}

export async function getPublishedListings(): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
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
    .select(PUBLIC_LISTING_SELECT)
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
    .select(PUBLIC_LISTING_SELECT)
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
    .select(PUBLIC_LISTING_SELECT)
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
    .select(PUBLIC_LISTING_SELECT)
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
    .select(PUBLIC_NEIGHBORHOOD_SELECT)
    .order("nom", { ascending: true });

  const databaseNeighborhoods = error || !data ? [] : (data as DbNeighborhood[]).map((n) => ({
    slug: n.slug,
    nom: n.nom,
    ville: n.ville,
    description: n.description ?? "",
    faits: n.faits ?? [],
    latitude: n.latitude ?? null,
    longitude: n.longitude ?? null,
    zoom: n.zoom ?? undefined,
  }));

  const bySlug = new Map(
    [...neighborhoods, ...databaseNeighborhoods].map((neighborhood) => [
      neighborhood.slug,
      neighborhood,
    ])
  );

  return CASABLANCA_QUARTIERS.map((nom) => {
    const slug = quartierSlug(nom);
    const existing = bySlug.get(slug);
    return {
      slug,
      nom,
      ville: existing?.ville ?? "Casablanca",
      description: existing?.description ?? "",
      faits: existing?.faits ?? [],
      latitude: existing?.latitude,
      longitude: existing?.longitude,
      zoom: existing?.zoom,
    };
  });
}

export async function getNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .select(PUBLIC_NEIGHBORHOOD_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return (await getNeighborhoods()).find((neighborhood) => neighborhood.slug === slug) ?? null;
  }
  const n = data as DbNeighborhood;
  return {
    slug: n.slug,
    nom: n.nom,
    ville: n.ville,
    description: n.description ?? "",
    faits: n.faits ?? [],
    latitude: n.latitude ?? null,
    longitude: n.longitude ?? null,
    zoom: n.zoom ?? undefined,
  };
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
