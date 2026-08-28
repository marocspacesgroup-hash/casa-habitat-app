import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import DualPathCta from "@/components/sections/DualPathCta";
import FeaturedListings from "@/components/sections/FeaturedListings";
import Services from "@/components/sections/Services";
import NeighborhoodsTeaser from "@/components/sections/NeighborhoodsTeaser";
import AboutCta from "@/components/sections/AboutCta";

export const metadata: Metadata = {
  title: "Agence immobilière à Casablanca",
  description:
    "Casa Habitat accompagne la vente, la location et l'investissement immobilier à Casablanca, pour une clientèle marocaine et internationale.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <DualPathCta />
      <FeaturedListings />
      <Services />
      <NeighborhoodsTeaser />
      <AboutCta />
    </>
  );
}
