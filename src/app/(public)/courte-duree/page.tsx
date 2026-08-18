import type { Metadata } from "next";
import ListingsPageContent from "@/components/sections/ListingsPageContent";

export const metadata: Metadata = {
  title: "Locations courte durée à Casablanca",
  description:
    "Appartements et studios meublés pour des séjours courts à Casablanca.",
  alternates: { canonical: "/courte-duree" },
};

export default async function CourteDureePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  return (
    <ListingsPageContent
      transaction="courte-duree"
      filters={filters}
      title="Séjours"
      emphasis="courte durée."
      breadcrumb="Courte durée"
      whatsappCta="Demander les disponibilités sur WhatsApp"
      description="Biens meublés et équipés, pour quelques nuits ou quelques mois. Disponibilités et tarifs sur demande — contactez-nous sur WhatsApp."
    />
  );
}
