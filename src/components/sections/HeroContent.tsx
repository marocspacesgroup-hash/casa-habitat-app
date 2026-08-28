 "use client";

import type { Neighborhood } from "@/data/types";
import { useTranslation } from "@/hooks/useTranslation";
import SearchBar from "./SearchBar";

export default function HeroContent({ neighborhoods }: { neighborhoods: Neighborhood[] }) {
  const { translation } = useTranslation();
  const hero = translation.hero as Record<string, any>;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-gold" />
        <span className="eyebrow text-gold">Cabinet Immobilier</span>
      </div>
      <h1 className="font-display text-ivory text-[clamp(34px,5vw,56px)] leading-[1.1] mb-6">
        {hero.title} <span className="text-gold italic">{hero.highlight}</span>
      </h1>
      <p className="text-ivory/70 max-w-xl text-[16px] mb-12">
        {hero.subtitle}
      </p>
      <SearchBar neighborhoods={neighborhoods} />
    </>
  );
}