import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return getPageMetadata("unfurnished", "/locations/vides");
}

export default async function LocationsVidesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  return (
    <ListingsPageContent
      transaction="location"
      meubleOnly={false}
      filters={filters}
      title="Locations"
      emphasis="vides."
      breadcrumb="Locations vides"
      description="Biens non meublés, à aménager selon vos goûts."
    />
  );
}
