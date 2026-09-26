import Link from "next/link";
import { getServerTranslation } from "@/lib/i18n/server";

export default async function NotFound() {\n  const { translation } = await getServerTranslation();\n  const t = translation.pages.notFound;
  return (
    <div className="min-h-[70vh] flex items-center justify-center pt-24">
      <div className="text-center px-6">
        <div className="w-14 h-14 rounded-full border border-gold flex items-center justify-center font-display text-gold text-lg mx-auto mb-8">
          CH
        </div>
        <h1 className="font-display text-3xl text-ink mb-4">
          {t.title}
        </h1>
        <p className="text-ink-soft mb-8">
          {t.text}
        </p>
        <Link
          href="/"
          className="inline-block bg-navy text-gold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm"
        >
          {t.back}
        </Link>
      </div>
    </div>
  );
}
