import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllPublishedSlugs, getNeighborhoods } from "@/lib/supabase/queries";
import { supportedLanguages } from "@/lib/i18n/config";

const localized = (pathname: string): MetadataRoute.Sitemap[number] => {
  const clean = pathname === "/" ? "" : pathname;
  const languages = Object.fromEntries(
    supportedLanguages.map((locale) => [locale, `${siteConfig.url}/${locale}${clean}`])
  );
  return { url: `${siteConfig.url}/fr${clean}`, alternates: { languages } };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/","/locations","/locations/meublees","/locations/vides","/vente","/courte-duree","/quartiers","/a-propos","/contact","/estimation","/confier-mon-bien"].map(localized);
  const [slugs, neighborhoods] = await Promise.all([getAllPublishedSlugs(), getNeighborhoods()]);
  // getAllPublishedSlugs() n'expose pas updated_at : le sitemap n'invente pas de lastModified.
  const listingRoutes = slugs.map((slug) => localized(`/biens/${slug}`));
  const neighborhoodRoutes = neighborhoods.map((n) => localized(`/quartiers/${n.slug}`));
  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}