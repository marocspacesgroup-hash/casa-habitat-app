import type { Metadata } from "next";
import ListingsPageContent from "@/components/sections/ListingsPageContent";

export const metadata: Metadata = {
  title: "Locations meublées à Casablanca",
  description: "Appartements et studios meublés à louer à Casablanca.",
  alternates: { canonical: "/locations/meublees" },
};

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
