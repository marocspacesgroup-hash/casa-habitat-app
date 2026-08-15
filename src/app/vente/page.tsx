import type { Metadata } from "next";
import ListingsPageContent from "@/components/sections/ListingsPageContent";

export const metadata: Metadata = {
  title: "Biens à vendre à Casablanca",
  description:
    "Appartements, villas et bureaux à vendre à Casablanca — sélection Casa Habitat.",
  alternates: { canonical: "/vente" },
};

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
