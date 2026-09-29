import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllPublishedSlugs, getNeighborhoods } from "@/lib/supabase/queries";
import { supportedLanguages } from "@/lib/i18n/config";

const localized = (pathname: string, lastModified: Date): MetadataRoute.Sitemap => {
  const clean = pathname === "/" ? "" : pathname;
  const languages = Object.fromEntries(
    supportedLanguages.map((locale) => [locale, `${siteConfig.url}/${locale}${clean}`])
  );
  return supportedLanguages.map((locale) => ({
    url: `${siteConfig.url}/${locale}${clean}`,
    lastModified,
    alternates: { languages },
  }));
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const publicRoutes = [
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
  ];

  const staticRoutes = publicRoutes.flatMap((route) => localized(route, now));

  const ownerRoutes = [
    "/gestion-locative",
    "/mettre-en-location",
    "/vendre-son-bien",
    "/courte-duree-proprietaire",
    "/proprietaire-a-distance",
    "/investissement",
  ].map((route) => ({
    url: `${siteConfig.url}/fr${route}`,
    lastModified: now,
  }));

  const [slugs, neighborhoods] = await Promise.all([
    getAllPublishedSlugs(),
    getNeighborhoods(),
  ]);

  const listingRoutes = slugs.flatMap((slug) => localized(`/biens/${slug}`, now));
  const neighborhoodRoutes = neighborhoods.flatMap((n) => localized(`/quartiers/${n.slug}`, now));

  return [...staticRoutes, ...ownerRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
