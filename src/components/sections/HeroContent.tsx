"use client";

import type { Neighborhood } from "@/data/types";
import { useTranslation } from "@/hooks/useTranslation";
import SearchBar from "./SearchBar";

export default function HeroContent({ neighborhoods }: { neighborhoods: Neighborhood[] }) {
  const { translation } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-gold" />
        <span className="eyebrow text-gold">{translation.hero.subtitle}</span>
      </div>
      <h1 className="font-display text-ivory text-[clamp(34px,5vw,58px)] leading-[1.08] max-w-3xl mb-6">
        {translation.hero.title}
      </h1>
      <p className="text-ivory/70 max-w-xl text-[16px] mb-12">
        {translation.hero.subtitle}
      </p>
      <SearchBar neighborhoods={neighborhoods} />
    </>
  );
}