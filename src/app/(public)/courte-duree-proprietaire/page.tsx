import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerLocale } from "@/lib/i18n/server";
import OwnerServicePage from "@/components/sections/OwnerServicePage";
import { ownerServiceContent } from "@/lib/i18n/owner-services";

export async function generateMetadata() {
  const metadata = await getPageMetadata("shortStayOwner", "/courte-duree-proprietaire");
  const locale = await getServerLocale();
  return locale === "fr" ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function CourteDureeProprietairePage() {
  const locale = await getServerLocale();
  return <OwnerServicePage locale={locale} content={ownerServiceContent["courte-duree-proprietaire"]} />;
}
