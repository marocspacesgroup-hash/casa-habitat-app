import type { Metadata } from "next";
import { getDynamicMetadata } from "@/lib/i18n/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNeighborhoods,
  getNeighborhoodBySlug,
  getPublishedListingsByNeighborhood,
} from "@/lib/supabase/queries";
import ListingCard from "@/components/ui/ListingCard";
import { siteConfig } from "@/config/site";
import MapboxMap from "@/components/MapboxMap";
import { getServerLocale } from "@/lib/i18n/server";
import { getNeighborhoodAuthority } from "@/data/neighborhood-authority";

const CASABLANCA_CENTER: [number, number] = [-7.6322, 33.5731];

// Pas de generateStaticParams : les quartiers viennent de Supabase et la
// page est rendue à la demande (le client Supabase serveur utilise les
// cookies de la requête, ce qui rend cette route dynamique de toute façon).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const n = await getNeighborhoodBySlug(slug);
  if (!n) return {};
  const locale = await getServerLocale();
  const authority = getNeighborhoodAuthority(slug);
  return {
    ...getDynamicMetadata(
    `Immobilier à ${n.nom}, Casablanca`,
    `${n.description} Biens à louer et à vendre à ${n.nom} avec Casa Habitat.`,
    `/quartiers/${slug}`
    ),
    robots:
      locale === "fr" && authority
        ? { index: true, follow: true }
        : { index: false, follow: true },
  };
}

export default async function QuartierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhoodBySlug(slug);
  if (!neighborhood) notFound();

  const [listings, allNeighborhoods] = await Promise.all([
    getPublishedListingsByNeighborhood(slug),
    getNeighborhoods(),
  ]);
  const others = allNeighborhoods.filter((n) => n.slug !== slug).slice(0, 5);
  const locale = await getServerLocale();
  const authority = locale === "fr" ? getNeighborhoodAuthority(slug) : null;

  // Centre général du quartier (Supabase) ; à défaut, vue d'ensemble de Casablanca.
  const { latitude, longitude, zoom } = neighborhood;
  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const mapCenter: [number, number] = hasCoordinates
    ? [longitude, latitude]
    : CASABLANCA_CENTER;
  const mapZoom = zoom ?? (hasCoordinates ? 13 : 11);
  const mapMarkers = hasCoordinates
    ? [{ id: neighborhood.slug, longitude, latitude, label: neighborhood.nom }]
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteConfig.url}/quartiers/${neighborhood.slug}#webpage`,
    name: `Immobilier à ${neighborhood.nom}, Casablanca`,
    description: neighborhood.description,
    url: `${siteConfig.url}/quartiers/${neighborhood.slug}`,
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    about: { "@type": "Place", name: neighborhood.nom, containedInPlace: { "@type": "City", name: "Casablanca" } },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: listings.map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/biens/${listing.slug}`,
        name: listing.titre,
      })),
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Quels types de biens trouve-t-on à ${neighborhood.nom} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Casa Habitat sélectionne des biens à ${neighborhood.nom} en location comme à la vente — contactez l'agence pour la disponibilité actualisée.`,
        },
      },
      {
        "@type": "Question",
        name: `Comment visiter un bien à ${neighborhood.nom} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Contactez Casa Habitat par WhatsApp ou téléphone au ${siteConfig.contact.phones[0]} pour organiser une visite.`,
        },
      },
    ],
  };

  return (
    <div className="pt-36 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8 flex gap-2">
          <Link href="/quartiers" className="hover:text-gold">Quartiers</Link>
          <span>/</span>
          <span className="text-ink">{neighborhood.nom}</span>
        </nav>

        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-5">
          Immobilier à <em className="text-gold not-italic italic">{neighborhood.nom}</em>
        </h1>
        <p className="text-ink-soft max-w-2xl mb-8">{authority?.intro ?? neighborhood.description}</p>

        {authority && (
          <section className="mb-16 border border-ink/10 rounded-sm p-7 md:p-9" aria-labelledby="quartier-expertise-title">
            <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">Expertise locale</span>
            <h2 id="quartier-expertise-title" className="font-display text-2xl text-ink mb-6">Comprendre le marché à {neighborhood.nom}</h2>
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-ink mb-3">Profil du secteur</h3>
                <ul className="space-y-3 text-sm text-ink-soft">
                  {authority.profile.map((item) => (
                    <li key={item} className="flex gap-3"><span className="text-gold" aria-hidden="true">•</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-3">À vérifier avant de décider</h3>
                <ul className="space-y-3 text-sm text-ink-soft">
                  {[...authority.buyerSignals, ...authority.ownerSignals].map((item) => (
                    <li key={item} className="flex gap-3"><span className="text-gold" aria-hidden="true">•</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            {authority.market && (
              <div className="border-t border-ink/10 pt-6">
                <p className="text-xs uppercase tracking-wide text-ink-soft mb-2">Indicateur de marché externe</p>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                  <p className="font-display text-2xl text-ink">{authority.market.value}</p>
                  <p className="text-sm text-ink-soft">{authority.market.label} · {authority.market.period}</p>
                </div>
                <p className="text-xs text-ink-soft mt-2">{authority.market.note} Source : {authority.market.sourceLabel}.</p>
              </div>
            )}
            <div className="border-t border-ink/10 mt-7 pt-6">
              <h3 className="font-semibold text-ink mb-3">Sources et méthode</h3>
              <p className="text-sm text-ink-soft mb-4">Casa Habitat distingue les informations de contexte, les biens réellement publiés et les indicateurs de marché externes. Les prix ci-dessus sont présentés avec leur date et leur source ; ils ne constituent pas une estimation automatique d’un bien ni un prix de transaction garanti.</p>
              <ul className="space-y-2 text-xs text-ink-soft">
                {authority.sources.map((source) => (
                  <li key={source.url}>{source.label} · {source.date}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <h2 className="font-display text-xl text-ink mb-4">
          Le marché immobilier à {neighborhood.nom}
        </h2>
        <p className="text-ink-soft max-w-2xl mb-8">
          Retrouvez les biens actuellement publiés par Casa Habitat à {neighborhood.nom},
          en location ou à la vente selon les disponibilités réelles.
        </p>

        <section className="mb-16" aria-labelledby="quartier-map-title">
          <h2 id="quartier-map-title" className="font-display text-xl text-ink mb-3">
            Zone générale de {neighborhood.nom}
          </h2>
          <p className="text-ink-soft text-sm max-w-2xl mb-5">
            La carte présente une zone indicative de Casablanca et ne localise jamais précisément un immeuble.
          </p>
          <div className="h-[360px] overflow-hidden rounded-sm border border-ink/10 bg-navy">
            <MapboxMap center={mapCenter} zoom={mapZoom} markers={mapMarkers} />
          </div>
        </section>

        <div className="flex flex-wrap gap-2 mb-16">
          {neighborhood.faits.map((f) => (
            <span
              key={f}
              className="text-xs font-mono uppercase tracking-wide border border-ink/15 rounded-sm px-3 py-1.5 text-ink-soft"
            >
              {f}
            </span>
          ))}
        </div>

        <h2 className="font-display text-2xl text-ink mb-8">
          Biens à {neighborhood.nom}
        </h2>
        {listings.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {listings.map((l) => (
              <ListingCard key={l.reference} listing={l} />
            ))}
          </div>
        ) : (
          <div className="border border-ink/10 rounded-sm p-10 text-center mb-20">
            <p className="text-ink-soft">
              Aucun bien publié à {neighborhood.nom} pour le moment — contactez-nous, de nouveaux biens arrivent régulièrement.
            </p>
          </div>
        )}

        <h2 className="font-display text-xl text-ink mb-5">Autres quartiers</h2>
        <div className="flex flex-wrap gap-3">
          {others.map((n) => (
            <Link
              key={n.slug}
              href={`/quartiers/${n.slug}`}
              className="text-sm text-navy border border-ink/15 rounded-sm px-4 py-2 hover:border-gold transition-colors"
            >
              {n.nom}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
