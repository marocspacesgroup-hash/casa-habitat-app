import { getNeighborhoods } from "@/lib/supabase/queries";
import HeroContent from "./HeroContent";

export default async function Hero() {
  const neighborhoods = await getNeighborhoods();
  return (
    <section className="relative bg-navy pt-36 pb-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #C9A35A 0px, #C9A35A 1px, transparent 1px, transparent 64px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6">
        <HeroContent neighborhoods={neighborhoods} />
      </div>
    </section>
  );
}
