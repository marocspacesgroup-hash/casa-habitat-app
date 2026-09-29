import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerLocale } from "@/lib/i18n/server";
import OwnerServicePage from "@/components/sections/OwnerServicePage";
import { ownerServiceContent } from "@/lib/i18n/owner-services";

export async function generateMetadata() {
  const metadata = await getPageMetadata("remoteOwner", "/proprietaire-a-distance");
  const locale = await getServerLocale();
  return locale === "fr" ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function ProprietaireADistancePage() {
  const locale = await getServerLocale();
  return <OwnerServicePage locale={locale} content={ownerServiceContent["proprietaire-a-distance"]} />;
}
