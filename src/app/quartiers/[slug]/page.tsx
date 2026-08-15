import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods, getNeighborhoodBySlug } from "@/data/neighborhoods";
import { getListingsByNeighborhood } from "@/data/listings";
import ListingCard from "@/components/ui/ListingCard";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return neighborhoods.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const n = getNeighborhoodBySlug(slug);
  if (!n) return {};
  return {
    title: `Immobilier à ${n.nom}, Casablanca`,
    description: `${n.description} Biens à louer et à vendre à ${n.nom} avec Casa Habitat.`,
  };
}

export default async function QuartierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) notFound();

  const listings = getListingsByNeighborhood(slug);
  const others = neighborhoods.filter((n) => n.slug !== slug).slice(0, 5);

  const jsonLd = {
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
      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8 flex gap-2">
          <Link href="/quartiers" className="hover:text-gold">Quartiers</Link>
          <span>/</span>
          <span className="text-ink">{neighborhood.nom}</span>
        </nav>

        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-5">
          Immobilier à <em className="text-gold not-italic italic">{neighborhood.nom}</em>
        </h1>
        <p className="text-ink-soft max-w-2xl mb-8">{neighborhood.description}</p>

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
