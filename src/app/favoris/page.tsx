import type { Metadata } from "next";
import FavorisContent from "@/components/sections/FavorisContent";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Vos biens enregistrés en favoris sur Casa Habitat.",
  alternates: { canonical: "/favoris" },
  robots: { index: false, follow: true },
};

export default function FavorisPage() {
  return <FavorisContent />;
}
