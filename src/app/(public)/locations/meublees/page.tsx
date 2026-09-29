import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return getPageMetadata("furnished", "/locations/meublees");
}

export default async function LocationsMeubleesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  return (
    <ListingsPageContent
      transaction="location"
      meubleOnly
      filters={filters}
      title="Locations"
      emphasis="meublées."
      breadcrumb="Locations meublées"
      description="Biens prêts à vivre, équipés — idéal pour une installation rapide."
    />
  );
}
