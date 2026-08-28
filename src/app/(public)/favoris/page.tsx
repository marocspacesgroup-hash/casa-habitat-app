import type { Metadata } from "next";
import FavorisContent from "@/components/sections/FavorisContent";
import { getPublishedListings } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Vos biens enregistrés en favoris sur Casa Habitat.",
  alternates: { canonical: "/favoris" },
  robots: { index: false, follow: true },
};

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
