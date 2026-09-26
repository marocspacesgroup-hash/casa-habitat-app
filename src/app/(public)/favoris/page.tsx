import FavorisContent from "@/components/sections/FavorisContent";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getPublishedListings } from "@/lib/supabase/queries";

export async function generateMetadata() {
  const metadata = await getPageMetadata("favorites", "/favoris");
  return { ...metadata, robots: { index: false, follow: true } };
}

export default async function FavorisPage() {
  const listings = await getPublishedListings();
  const publicListings = listings.map(
    ({
      reference,
      slug,
      isSample,
      titre,
      transaction,
      statut,
      quartierNom,
      ville,
      prix,
      periodePrix,
      surfaceM2,
      pieces,
      chambres,
      sallesDeBain,
      imagePrincipale,
    }) => ({
      reference,
      slug,
      isSample,
      titre,
      transaction,
      statut,
      quartierNom,
      ville,
      prix,
      periodePrix,
      surfaceM2,
      pieces,
      chambres,
      sallesDeBain,
      imagePrincipale,
    })
  );
  return <FavorisContent listings={publicListings} />;
}
