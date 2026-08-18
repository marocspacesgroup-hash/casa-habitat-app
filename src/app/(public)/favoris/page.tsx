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
  return <FavorisContent listings={listings} />;
}
