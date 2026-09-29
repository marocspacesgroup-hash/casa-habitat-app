import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_GUIDES } from "@/data/seo-guides";
import { getServerLocale } from "@/lib/i18n/server";
import { siteConfig } from "@/config/site";

export async function generateStaticParams() {
  return SEO_GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = SEO_GUIDES.find((item) => item.slug === slug);
  if (!guide) return {};
  const locale = await getServerLocale();
  if (locale !== "fr") return { robots: { index: false, follow: true } };
  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `${siteConfig.url}/fr/guides/${guide.slug}`,
      languages: { fr: `${siteConfig.url}/fr/guides/${guide.slug}` },
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${siteConfig.url}/fr/guides/${guide.slug}`,
      siteName: siteConfig.name,
      type: "article",
      locale: "fr_MA",
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  if (locale !== "fr") notFound();

  const guide = SEO_GUIDES.find((item) => item.slug === slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${siteConfig.url}/fr/guides/${guide.slug}#article`,
    headline: guide.title,
    description: guide.description,
    mainEntityOfPage: `${siteConfig.url}/fr/guides/${guide.slug}`,
    publisher: { "@id": `${siteConfig.url}/#organization` },
    about: {
      "@type": "Place",
      name: "Casablanca",
      address: { "@type": "PostalAddress", addressLocality: "Casablanca", addressCountry: "MA" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteConfig.url}/fr` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${siteConfig.url}/fr/guides` },
      { "@type": "ListItem", position: 3, name: guide.title, item: `${siteConfig.url}/fr/guides/${guide.slug}` },
    ],
  };

  return (
    <main className="pt-36 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <article className="max-w-4xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8">
          <Link href="/fr" className="hover:text-gold">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/fr/guides" className="hover:text-gold">Guides</Link>
          <span className="mx-2">/</span>
          <span>{guide.title}</span>
        </nav>
        <p className="eyebrow text-gold mb-4">Guide immobilier Casablanca</p>
        <h1 className="font-display text-[clamp(32px,4vw,52px)] text-ink mb-7">{guide.title}</h1>
        <p className="text-lg leading-8 text-ink-soft mb-12">{guide.intro}</p>

        <div className="space-y-12">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink mb-4">{section.heading}</h2>
              <div className="space-y-4 text-ink-soft leading-7">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.bullets && (
                <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3"><span className="text-gold" aria-hidden="true">•</span>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-16 border border-ink/10 rounded-sm p-7">
          <h2 className="font-display text-2xl text-ink mb-5">Continuer votre recherche</h2>
          <div className="flex flex-wrap gap-3">
            {guide.relatedLinks.map((link) => (
              <Link key={link.href} href={`/fr${link.href}`} className="text-sm text-navy border border-ink/15 rounded-sm px-4 py-2 hover:border-gold">
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl text-ink mb-4">Quartiers à explorer</h2>
          <div className="flex flex-wrap gap-3">
            {guide.relatedNeighborhoods.map((name) => {
              const slug = name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              return (
                <Link key={name} href={`/fr/quartiers/${slug}`} className="text-sm text-navy hover:text-gold">
                  {name}
                </Link>
              );
            })}
          </div>
        </section>
      </article>
    </main>
  );
}
