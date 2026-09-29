import ListingsPageContent from "@/components/sections/ListingsPageContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("shortStay", "/courte-duree");
}

export default async function CourteDureePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const filters = await searchParams;
  const { translation } = await getServerTranslation();
  return (
    <ListingsPageContent
      transaction="courte-duree"
      filters={filters}
      title={translation.pages.listings.shortTitle}
      emphasis={translation.pages.listings.shortEmphasis}
      breadcrumb={translation.pages.listings.shortBreadcrumb}
      whatsappCta={translation.pages.listings.whatsappAvailability}
      description={translation.pages.listings.shortDescription}
    />
  );
}
