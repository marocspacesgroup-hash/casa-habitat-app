import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("locations", "/locations");
}

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  const { translation } = await getServerTranslation();
  return (
    <ListingsPageContent
      transaction="location"
      filters={filters}
      title={translation.pages.listings.rentalsTitle}
      emphasis={translation.pages.listings.rentalsEmphasis}
      breadcrumb={translation.pages.listings.rentalsBreadcrumb}
      description={translation.pages.listings.rentalsDescription}
    />
  );
}
