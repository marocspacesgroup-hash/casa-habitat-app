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
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full md:w-[72%] bg-gradient-to-r from-navy/40 via-navy/16 to-transparent"
        />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <HeroContent neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
