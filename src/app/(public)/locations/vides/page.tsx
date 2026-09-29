import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("unfurnished", "/locations/vides");
}

export default async function LocationsVidesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const filters = await searchParams;
  const { translation } = await getServerTranslation();
  const t = translation.pages.listings;
  return <ListingsPageContent transaction="location" meubleOnly={false} filters={filters} title={t.unfurnishedTitle} emphasis={t.unfurnishedEmphasis} breadcrumb={t.unfurnishedBreadcrumb} description={t.unfurnishedDescription} />;
}
