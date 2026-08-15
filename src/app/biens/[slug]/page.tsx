import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getListingBySlug,
  getSimilarListings,
  listings,
} from "@/data/listings";
import { getNeighborhoodBySlug } from "@/data/neighborhoods";
import { formatPrice, propertyTypeLabel, transactionLabel } from "@/lib/format";
import { whatsappForListing } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";
import ListingCard from "@/components/ui/ListingCard";
import ShareButtons from "@/components/ui/ShareButtons";

export function generateStaticParams() {
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) return {};
  const neighborhood = getNeighborhoodBySlug(listing.quartierSlug);
  return {
    title: `${listing.titre} — ${neighborhood?.nom ?? listing.ville}`,
    description: listing.description,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();

  const neighborhood = getNeighborhoodBySlug(listing.quartierSlug);
  const similar = getSimilarListings(listing);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.titre,
    description: listing.description,
    sku: listing.reference,
    offers: {
      "@type": "Offer",
      price: listing.prix ?? undefined,
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteConfig.url },
      {
        "@type": "ListItem",
        position: 2,
        name: transactionLabel(listing.transaction),
        item: `${siteConfig.url}/${
          listing.transaction === "vente" ? "vente" : "locations"
        }`,
      },
      { "@type": "ListItem", position: 3, name: listing.titre },
    ],
  };

  return (
    <div className="pt-32 pb-24">
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8 flex gap-2 flex-wrap">
          <Link href="/" className="hover:text-gold">Accueil</Link>
          <span>/</span>
          <Link
            href={listing.transaction === "vente" ? "/vente" : "/locations"}
            className="hover:text-gold"
          >
            {transactionLabel(listing.transaction)}
          </Link>
          <span>/</span>
          <span className="text-ink">{listing.titre}</span>
        </nav>

        {listing.isDemo && (
          <div className="bg-gold/10 border border-gold/30 text-ink text-sm px-4 py-3 rounded-sm mb-8">
            Annonce de démonstration — utilisée pour tester l&apos;interface, à remplacer par une vraie annonce.
          </div>
        )}

        {/* Galerie */}
        <div className="grid md:grid-cols-3 gap-3 mb-12">
          <div className="md:col-span-2 aspect-[4/3] rounded-t-[80px] bg-gradient-to-br from-[#1e3a58] to-navy" />
          <div className="grid grid-rows-2 gap-3">
            <div className="rounded-sm bg-gradient-to-br from-[#234166] to-navy" />
            <div className="rounded-sm bg-gradient-to-br from-[#132539] to-navy" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-14">
          <div className="lg:col-span-2">
            <div className="font-mono text-[10.5px] uppercase tracking-widest text-gold mb-3">
              {neighborhood?.nom ?? listing.ville} · Réf. {listing.reference}
            </div>
            <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-6">
              {listing.titre}
            </h1>

            <div className="flex flex-wrap gap-6 mb-10 pb-10 border-b border-ink/10">
              <Spec label="Type" value={propertyTypeLabel(listing.typeBien)} />
              <Spec label="Surface" value={`${listing.surfaceM2} m²`} />
              <Spec label="Chambres" value={String(listing.chambres)} />
              <Spec label="Salles de bain" value={String(listing.sallesDeBain)} />
              {listing.etage && <Spec label="Étage" value={listing.etage} />}
              <Spec label="Ascenseur" value={listing.ascenseur ? "Oui" : "Non"} />
              <Spec label="Parking" value={listing.parking ? "Oui" : "Non"} />
              <Spec label="Meublé" value={listing.meuble ? "Oui" : "Non"} />
            </div>

            <h2 className="font-display text-xl text-ink mb-4">Description</h2>
            <p className="text-ink-soft mb-10 leading-relaxed">{listing.description}</p>

            <h2 className="font-display text-xl text-ink mb-4">Équipements</h2>
            <div className="flex flex-wrap gap-2 mb-10">
              {listing.equipements.map((eq) => (
                <span
                  key={eq}
                  className="text-xs font-mono uppercase tracking-wide border border-ink/15 rounded-sm px-3 py-1.5 text-ink-soft"
                >
                  {eq}
                </span>
              ))}
            </div>

            {neighborhood && (
              <>
                <h2 className="font-display text-xl text-ink mb-4">
                  À propos du quartier
                </h2>
                <p className="text-ink-soft mb-2">{neighborhood.description}</p>
                <Link
                  href={`/quartiers/${neighborhood.slug}`}
                  className="text-sm font-semibold text-navy border-b border-gold pb-0.5"
                >
                  Découvrir {neighborhood.nom} →
                </Link>
              </>
            )}
          </div>

          {/* Sidebar contact */}
          <aside className="lg:sticky lg:top-28 h-fit bg-navy rounded-sm p-8">
            <div className="font-display text-2xl text-ivory mb-1">
              {formatPrice(listing)}
            </div>
            <div className="text-ivory/50 text-sm mb-8">
              {transactionLabel(listing.transaction)}
            </div>

            <div className="flex flex-col gap-3 mb-8">
              <a
                href={whatsappForListing(listing)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gold text-navy text-center font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
              >
                Demander une visite
              </a>
              <a
                href={`tel:${siteConfig.contact.phones[0]}`}
                className="border border-ivory/30 text-ivory text-center text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:border-gold hover:text-gold transition-colors"
              >
                Appeler l&apos;agence
              </a>
              <Link
                href="/contact"
                className="text-ivory/60 text-center text-xs underline underline-offset-4"
              >
                Contacter Casa Habitat
              </Link>
            </div>

            <div className="border-t border-ivory/15 pt-6">
              <div className="eyebrow text-gold mb-3">Partager</div>
              <ShareButtons title={listing.titre} />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="mt-24">
            <h2 className="font-display text-2xl text-ink mb-8">Biens similaires</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {similar.map((l) => (
                <ListingCard key={l.reference} listing={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-1">
        {label}
      </div>
      <div className="text-ink font-medium">{value}</div>
    </div>
  );
}
