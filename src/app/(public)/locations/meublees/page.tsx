import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const noindex = Object.keys(params).length > 0;
  return getPageMetadata("furnished", "/locations/meublees", { noindex });
}

export default async function LocationsMeubleesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const filters = await searchParams;
  const { translation } = await getServerTranslation();
  const t = translation.pages.listings;
  return <ListingsPageContent transaction="location" meubleOnly filters={filters} title={t.furnishedTitle} emphasis={t.furnishedEmphasis} breadcrumb={t.furnishedBreadcrumb} description={t.furnishedDescription} />;
}
