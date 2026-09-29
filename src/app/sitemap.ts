import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllPublishedSlugs, getNeighborhoods } from "@/lib/supabase/queries";
import { supportedLanguages } from "@/lib/i18n/config";

const localized = (pathname: string, lastModified: Date): MetadataRoute.Sitemap[number] => {
  const clean = pathname === "/" ? "" : pathname;
  const languages = Object.fromEntries(
    supportedLanguages.map((locale) => [locale, `${siteConfig.url}/${locale}${clean}`])
  );
  return {
    url: `${siteConfig.url}/fr${clean}`,
    lastModified,
    alternates: { languages },
  };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "/",
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
  ].map((route) => localized(route, now));

  const [slugs, neighborhoods] = await Promise.all([
    getAllPublishedSlugs(),
    getNeighborhoods(),
  ]);

  // Seuls les biens publiés sont inclus : les brouillons et archives restent exclus.
  const listingRoutes = slugs.map((slug) => localized(`/biens/${slug}`, now));
  const neighborhoodRoutes = neighborhoods.map((n) =>
    localized(`/quartiers/${n.slug}`, now)
  );

  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
