import Hero from "@/components/sections/Hero";
import DualPathCta from "@/components/sections/DualPathCta";
import FeaturedListings from "@/components/sections/FeaturedListings";
import Services from "@/components/sections/Services";
import NeighborhoodsTeaser from "@/components/sections/NeighborhoodsTeaser";
import AboutCta from "@/components/sections/AboutCta";

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
