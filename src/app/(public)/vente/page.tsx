import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return getPageMetadata("sales", "/vente");
}

export default async function VentePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  return (
    <ListingsPageContent
      transaction="vente"
      filters={filters}
      title="Biens à vendre"
      emphasis="à Casablanca."
      breadcrumb="Vente"
      description="Une sélection resserrée, chaque bien visité et qualifié avant d'être proposé."
    />
  );
}
