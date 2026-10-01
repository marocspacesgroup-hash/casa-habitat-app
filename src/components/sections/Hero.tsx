import { getNeighborhoods } from "@/lib/supabase/queries";
import HeroContent from "./HeroContent";

const HERO_IMAGE = "/images/home/casa-habitat-casablanca-hero.webp";

export default async function Hero() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="relative overflow-hidden bg-navy pt-36 pb-20">
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/[0.88] via-navy/[0.76] to-navy/[0.65]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #C9A35A 0px, #C9A35A 1px, transparent 1px, transparent 64px)",
          }}
        />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <HeroContent neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
