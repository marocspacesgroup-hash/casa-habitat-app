import type { Metadata } from "next";
import ListingsPageContent from "@/components/sections/ListingsPageContent";

export const metadata: Metadata = {
  title: "Locations à Casablanca",
  description:
    "Appartements, studios et villas à louer à Casablanca — sélection Casa Habitat, meublés et non meublés.",
  alternates: { canonical: "/locations" },
};

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
