import { revalidatePath } from "next/cache";

/** Revalide toutes les pages publiques susceptibles d'afficher ce bien. */
export function revalidateListingPaths(opts: {
  slug?: string;
  quartierSlug?: string;
}) {
  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/locations/meublees");
  revalidatePath("/locations/vides");
  revalidatePath("/vente");
  revalidatePath("/courte-duree");
  revalidatePath("/sitemap.xml");
  if (opts.slug) revalidatePath(`/biens/${opts.slug}`);
  if (opts.quartierSlug) revalidatePath(`/quartiers/${opts.quartierSlug}`);
  revalidatePath("/admin/dashboard");
}
