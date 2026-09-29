import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getPublishedListingSitemapEntries, getNeighborhoods } from "@/lib/supabase/queries";
import { supportedLanguages } from "@/lib/i18n/config";
import { AUTHORITY_READY_NEIGHBORHOODS } from "@/data/neighborhood-authority";

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

  const [listingEntries, neighborhoods] = await Promise.all([
    getPublishedListingSitemapEntries(),
    getNeighborhoods(),
  ]);

  const listingRoutes = listingEntries.flatMap((entry) => {
    const languages = Object.fromEntries(
      entry.locales.map((locale) => [
        locale,
        `${siteConfig.url}/${locale}/biens/${entry.slug}`,
      ])
    );
    return entry.locales.map((locale) => ({
      url: `${siteConfig.url}/${locale}/biens/${entry.slug}`,
      lastModified: new Date(entry.updatedAt),
      alternates: { languages },
    }));
  });
  const neighborhoodRoutes = neighborhoods
    .filter((n) => AUTHORITY_READY_NEIGHBORHOODS.includes(n.slug))
    .map((n) => ({
      url: `${siteConfig.url}/fr/quartiers/${n.slug}`,
      lastModified: now,
    }));

  const guideSlugs = [
    "louer-appartement-casablanca",
    "choisir-quartier-casablanca",
    "confier-bien-location-casablanca",
    "acheter-appartement-casablanca",
    "investissement-locatif-casablanca",
  ];
  const guideRoutes = [
    { url: `${siteConfig.url}/fr/guides`, lastModified: now },
    ...guideSlugs.map((slug) => ({
      url: `${siteConfig.url}/fr/guides/${slug}`,
      lastModified: now,
    })),
  ];

  return [...staticRoutes, ...ownerRoutes, ...listingRoutes, ...neighborhoodRoutes, ...guideRoutes];
}
