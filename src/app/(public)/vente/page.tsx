import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("sales", "/vente");
}

export default async function VentePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  const { translation } = await getServerTranslation();
  return (
    <ListingsPageContent
      transaction="vente"
      filters={filters}
      title={translation.pages.listings.salesTitle}
      emphasis={translation.pages.listings.salesEmphasis}
      breadcrumb={translation.pages.listings.salesBreadcrumb}
      description={translation.pages.listings.salesDescription}
    />
  );
}
