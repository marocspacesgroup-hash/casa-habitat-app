import type { Metadata } from "next";
import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { SEO_GUIDES } from "@/data/seo-guides";
import { siteConfig } from "@/config/site";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  if (locale !== "fr") return { robots: { index: false, follow: true } };
  return {
    title: "Guides immobiliers à Casablanca | Casa Habitat",
    description:
      "Guides pratiques de Casa Habitat pour louer, acheter, investir ou confier un bien immobilier à Casablanca.",
    alternates: {
      canonical: `${siteConfig.url}/fr/guides`,
      languages: { fr: `${siteConfig.url}/fr/guides` },
    },
    openGraph: {
      title: "Guides immobiliers à Casablanca | Casa Habitat",
      description:
        "Guides pratiques pour comprendre la location, l'achat et l'investissement immobilier à Casablanca.",
      url: `${siteConfig.url}/fr/guides`,
      siteName: siteConfig.name,
      type: "website",
      locale: "fr_MA",
    },
  };
}

export default async function GuidesPage() {
  const locale = await getServerLocale();
  if (locale !== "fr") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guides immobiliers à Casablanca",
    description:
      "Guides pratiques de Casa Habitat pour les projets immobiliers à Casablanca.",
    url: `${siteConfig.url}/fr/guides`,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };

  return (
    <main className="pt-36 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8">
          <Link href="/fr" className="hover:text-gold">Accueil</Link>
          <span className="mx-2">/</span>
          <span>Guides</span>
        </nav>
        <p className="eyebrow text-gold mb-4">Ressources Casa Habitat</p>
        <h1 className="font-display text-[clamp(32px,4vw,52px)] text-ink mb-5">
          Guides immobiliers à Casablanca
        </h1>
        <p className="text-ink-soft max-w-3xl text-lg mb-12">
          Des méthodes concrètes pour comparer un logement, préparer une location,
          acheter, investir ou confier un bien à Casa Habitat.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {SEO_GUIDES.map((guide) => (
            <article key={guide.slug} className="border border-ink/10 rounded-sm p-7">
              <h2 className="font-display text-2xl text-ink mb-3">
                <Link href={`/fr/guides/${guide.slug}`} className="hover:text-gold">
                  {guide.title}
                </Link>
              </h2>
              <p className="text-ink-soft text-sm leading-6 mb-5">{guide.description}</p>
              <Link
                href={`/fr/guides/${guide.slug}`}
                className="text-sm font-semibold text-navy hover:text-gold"
              >
                Lire le guide →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
