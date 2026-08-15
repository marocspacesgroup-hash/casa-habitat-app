import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listings } from "@/data/listings";
import { neighborhoods } from "@/data/neighborhoods";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const listingRoutes = listings.map((l) => ({
    url: `${siteConfig.url}/biens/${l.slug}`,
    lastModified: new Date(),
  }));

  const neighborhoodRoutes = neighborhoods.map((n) => ({
    url: `${siteConfig.url}/quartiers/${n.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
