import Image from "next/image";
import { getNeighborhoods } from "@/lib/supabase/queries";
import HeroContent from "./HeroContent";

const HERO_IMAGE = "/images/home/casa-habitat-casablanca-hero.webp";

export default async function Hero() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="relative overflow-hidden bg-navy pt-36 pb-20">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <HeroContent neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
