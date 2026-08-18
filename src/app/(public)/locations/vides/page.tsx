import type { Metadata } from "next";
import ListingsPageContent from "@/components/sections/ListingsPageContent";

export const metadata: Metadata = {
  title: "Locations vides à Casablanca",
  description: "Appartements et villas non meublés à louer à Casablanca.",
  alternates: { canonical: "/locations/vides" },
};

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
