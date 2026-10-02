import Image from "next/image";
import { getNeighborhoods } from "@/lib/supabase/queries";
import HeroContent from "./HeroContent";

const HERO_IMAGE = "/images/home/casa-habitat-casablanca-hero.avif";

export default async function Hero() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="relative isolate overflow-hidden bg-navy pt-36 pb-20">
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center z-0"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-10 w-full md:w-[72%] bg-gradient-to-r from-navy/40 via-navy/16 to-transparent"
        />
      </div>
      <div className="relative z-20 max-w-6xl mx-auto px-6">
        <HeroContent neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
