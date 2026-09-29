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
    .eq("is_sample", false)
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
    .eq("is_sample", false)
    .eq("transaction", toDbTransaction(transaction))
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supabase] Failed to load published listings by transaction", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  if (!data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export type ListingTranslation = {
  listing_id: string;
  locale: string;
  titre: string | null;
  description: string | null;
  conditions_particulieres: string | null;
};

export async function getListingTranslatedLocales(listingId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_translations")
    .select("locale, titre, description")
    .eq("listing_id", listingId);

  if (error || !data) return [];
  return (data as Array<{ locale: string; titre: string | null; description: string | null }>)
    .filter((translation) => translation.titre && translation.description)
    .map((translation) => translation.locale);
}

export async function getListingTranslation(
  listingId: string,
  locale: string
): Promise<ListingTranslation | null> {
  if (locale === "fr") return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_translations")
    .select("listing_id, locale, titre, description, conditions_particulieres")
    .eq("listing_id", listingId)
    .eq("locale", locale)
    .maybeSingle();

  if (error || !data) return null;
  const translation = data as ListingTranslation;
  return translation.titre && translation.description ? translation : null;
}

function applyListingTranslation(
  listing: Listing,
  translation: ListingTranslation | null
): Listing {
  if (!translation?.titre || !translation.description) return listing;
  return {
    ...listing,
    titre: translation.titre,
    description: translation.description,
    conditionsParticulieres:
      translation.conditions_particulieres ?? listing.conditionsParticulieres,
  };
}

export async function getPublishedListingByReference(reference: string): Promise<Listing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !data) return null;
  return adaptListingForPublicSite(data as unknown as DbListingWithImages);
}

export async function getPublishedListingBySlug(
  slug: string,
  locale = "fr"
): Promise<Listing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("is_sample", false)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const listing = await adaptListingForPublicSite(data as unknown as DbListingWithImages);
  return applyListingTranslation(listing, await getListingTranslation(listing.id, locale));
}

export async function getPublishedListingsByNeighborhood(
  quartierSlug: string
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("is_sample", false)
    .eq("quartier_slug", quartierSlug)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return adaptListingsForPublicSite(data as unknown as DbListingWithImages[]);
}

export async function getSimilarPublishedListings(
  listing: Listing,
  max = 3,
  locale = "fr"
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("publication_status", "publie")
    .eq("is_sample", false)
    .eq("transaction", toDbTransaction(listing.transaction))
    .not("availability_status", "in", "(loue,vendu)")
    .neq("slug", listing.slug)
    .or(`quartier_slug.eq.${listing.quartierSlug},type_bien.eq.${listing.typeBien}`)
    .limit(12);

  if (error || !data) return [];

  const candidates = await adaptListingsForPublicSite(
    data as unknown as DbListingWithImages[]
  );
  const score = (candidate: Listing) => {
    let value = 0;
    if (candidate.quartierSlug === listing.quartierSlug) value += 30;
    if (candidate.typeBien === listing.typeBien) value += 20;
    if (candidate.statut === "disponible") value += 10;
    if (candidate.chambres === listing.chambres) value += 8;
    if (Math.abs(candidate.surfaceM2 - listing.surfaceM2) <= 25) value += 6;
    if (
      listing.prix !== null &&
      candidate.prix !== null &&
      Math.abs(candidate.prix - listing.prix) <= Math.max(1000, listing.prix * 0.2)
    ) value += 4;
    return value;
  };

  const ranked = candidates.sort((a, b) => score(b) - score(a)).slice(0, max);
  if (locale === "fr") return ranked;

  const translations = await Promise.all(
    ranked.map((candidate) => getListingTranslation(candidate.id, locale))
  );
  return ranked.map((candidate, index) =>
    applyListingTranslation(candidate, translations[index])
  );
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
    faits: n.faits,
    latitude: n.latitude,
    longitude: n.longitude,
    zoom: n.zoom,
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
      latitude: existing?.latitude ?? null,
      longitude: existing?.longitude ?? null,
      zoom: existing?.zoom ?? null,
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
    faits: n.faits,
    latitude: n.latitude,
    longitude: n.longitude,
    zoom: n.zoom,
  };
}

export type ListingSitemapEntry = {
  slug: string;
  updatedAt: string;
  locales: string[];
};

export async function getPublishedListingSitemapEntries(): Promise<ListingSitemapEntry[]> {
  const supabase = await createClient();
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, slug, updated_at")
    .eq("publication_status", "publie")
    .eq("is_sample", false)
    .not("availability_status", "in", "(loue,vendu)");

  if (error || !listings) return [];

  const ids = listings.map((row) => row.id as string);
  const { data: translations } = ids.length
    ? await supabase
        .from("listing_translations")
        .select("listing_id, locale, titre, description")
        .in("listing_id", ids)
    : { data: [] as Array<{ listing_id: string; locale: string; titre: string | null; description: string | null }> };

  const translatedByListing = new Map<string, string[]>();
  for (const translation of (translations ?? []) as Array<{
    listing_id: string;
    locale: string;
    titre: string | null;
    description: string | null;
  }>) {
    if (!translation.titre || !translation.description) continue;
    const locales = translatedByListing.get(translation.listing_id) ?? [];
    locales.push(translation.locale);
    translatedByListing.set(translation.listing_id, locales);
  }

  return listings.map((row) => ({
    slug: row.slug as string,
    updatedAt: row.updated_at as string,
    locales: [
      "fr",
      ...(translatedByListing.get(row.id as string) ?? []).filter((locale) => locale !== "fr"),
    ],
  }));
}
