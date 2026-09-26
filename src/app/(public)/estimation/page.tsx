import EstimationForm from "@/components/sections/EstimationForm";
import { getPageMetadata } from "@/lib/i18n/metadata";
import { getServerTranslation } from "@/lib/i18n/server";

export async function generateMetadata() {
  return getPageMetadata("estimation", "/estimation");
}

export default async function EstimationPage() {\n  const { translation } = await getServerTranslation();\n  const t = translation.pages.estimation;
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Estimation
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
          {t.title} <em className="text-gold not-italic italic">{t.emphasis}</em>
        </h1>
        <p className="text-ink-soft mb-14">
          {t.description}
        </p>
        <EstimationForm />
      </div>
    </div>
  );
}
