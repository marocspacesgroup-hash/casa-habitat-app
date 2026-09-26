import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return getPageMetadata("locations", "/locations");
}

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  return (
    <ListingsPageContent
      transaction="location"
      filters={filters}
      title="Biens à louer"
      emphasis="à Casablanca."
      breadcrumb="Locations"
      description="Appartements, studios et villas — meublés et non meublés, vérifiés avant publication."
    />
  );
}
