import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllPublishedSlugs, getNeighborhoods } from "@/lib/supabase/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/locations",
    "/locations/meublees",
    "/locations/vides",
    "/vente",
    "/courte-duree",
    "/quartiers",
    "/a-propos",
    "/contact",
    "/estimation",
    "/confier-mon-bien",
    "/mentions-legales",
    "/politique-confidentialite",
  ].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
  }));

  const [slugs, neighborhoods] = await Promise.all([
    getAllPublishedSlugs(),
    getNeighborhoods(),
  ]);

  // Seuls les biens publiés (publication_status = "publie") sont renvoyés
  // par getAllPublishedSlugs — brouillons et archives n'apparaissent jamais
  // dans le sitemap, conformément à la règle d'indexabilité.
  const listingRoutes = slugs.map((slug) => ({
    url: `${siteConfig.url}/biens/${slug}`,
    lastModified: new Date(),
  }));

  const neighborhoodRoutes = neighborhoods.map((n) => ({
    url: `${siteConfig.url}/quartiers/${n.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
