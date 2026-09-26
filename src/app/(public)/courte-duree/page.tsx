import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return getPageMetadata("shortStay", "/courte-duree");
}

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
