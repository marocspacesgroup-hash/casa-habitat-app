import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPublishedListingBySlug,
  getSimilarPublishedListings,
  getNeighborhoodBySlug,
} from "@/lib/supabase/queries";
import {
  conditionLabel,
  formatPrice,
  propertyTypeLabel,
  seoTitle,
  statusLabel,
  transactionLabel,
} from "@/lib/format";
import { siteConfig } from "@/config/site";
import ListingCard from "@/components/ui/ListingCard";
import ShareButtons from "@/components/ui/ShareButtons";
import PropertyImage from "@/components/ui/PropertyImage";
import ListingContactActions from "@/components/ui/ListingContactActions";
import ListingViewTracker from "@/components/ui/ListingViewTracker";

// Pas de generateStaticParams : les biens viennent de Supabase et peuvent
// changer à tout moment depuis l'admin (prix, statut, photos...). La page
// est rendue à la demande et revalidée explicitement par les server actions
// admin (revalidatePath) après chaque modification — jamais besoin d'un
// nouveau build pour qu'un changement apparaisse publiquement.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) return {};
  const neighborhood = await getNeighborhoodBySlug(listing.quartierSlug);
  const title = seoTitle(listing, neighborhood?.nom);
  const metaDescription = `${seoTitle(listing, neighborhood?.nom)}. ${listing.description.slice(0, 135)}${listing.description.length > 135 ? "…" : ""}`;
  const ogImage =
    listing.imagePrincipale.kind === "photo"
      ? [
          {
            url: listing.imagePrincipale.src,
            width: listing.imagePrincipale.width,
            height: listing.imagePrincipale.height,
            alt: listing.imagePrincipale.alt,
          },
        ]
      : undefined;
  return {
    title,
    description: metaDescription,
    alternates: { canonical: `/biens/${listing.slug}` },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description: metaDescription,
      url: `${siteConfig.url}/biens/${listing.slug}`,
      type: "article",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: ogImage,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) notFound();

  const [neighborhood, similar] = await Promise.all([
    getNeighborhoodBySlug(listing.quartierSlug),
    getSimilarPublishedListings(listing),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: seoTitle(listing, neighborhood?.nom),
    url: `${siteConfig.url}/biens/${listing.slug}`,
    description: listing.description,
    sku: listing.reference,
    image:
      listing.imagePrincipale.kind === "photo"
        ? `${siteConfig.url}${listing.imagePrincipale.src}`
        : undefined,
    about: {
      "@type": "Place",
      name: neighborhood?.nom ?? listing.ville,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Type de bien",
        value: propertyTypeLabel(listing.typeBien),
      },
      { "@type": "PropertyValue", name: "Surface", value: `${listing.surfaceM2} m²` },
    ],
    offers: {
      "@type": "Offer",
      price: listing.prix ?? undefined,
      priceCurrency: "MAD",
      availability:
        listing.statut === "disponible"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}/biens/${listing.slug}`,
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

  // Vignettes secondaires : toutes les photos SAUF l'image principale déjà
  // affichée en grand — évite de la répéter (l'admin peut définir n'importe
  // quelle photo comme principale, sa position dans la liste n'est pas fiable).
  const isSameImage = (a: (typeof listing.images)[number], b: typeof listing.imagePrincipale) =>
    a.kind === "photo" && b.kind === "photo" && a.src === b.src;
  const secondaryImages = listing.images.filter(
    (img) => !isSameImage(img, listing.imagePrincipale)
  );

  return (
    <div className="pt-32 pb-24">
      <ListingViewTracker reference={listing.reference} />
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

        {listing.isSample && (
          <div className="bg-navy/5 border border-navy/15 text-ink-soft text-sm px-4 py-3 rounded-sm mb-8">
            Fiche présentée à titre d&apos;exemple — les annonces réelles de Casa Habitat seront publiées ici.
          </div>
        )}

        {/* Galerie */}
        <div className="grid md:grid-cols-3 gap-3 mb-12">
          <div className="md:col-span-2 aspect-[4/3] rounded-t-[80px] overflow-hidden">
            <PropertyImage image={listing.imagePrincipale} priority sizes="(min-width: 768px) 66vw, 100vw" />
          </div>
          <div className="grid grid-rows-2 gap-3">
            {secondaryImages.slice(0, 2).map((img, i) => (
              <div key={i} className="rounded-sm overflow-hidden">
                <PropertyImage image={img} sizes="33vw" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-14">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-gold">
                {neighborhood?.nom ?? listing.ville} · Réf. {listing.reference}
              </div>
              {listing.statut !== "disponible" && (
                <span className="font-mono text-[10px] uppercase tracking-widest bg-ink/5 text-ink-soft px-2.5 py-1 rounded-sm">
                  {statusLabel(listing.statut)}
                </span>
              )}
            </div>
            <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-6">
              {seoTitle(listing, neighborhood?.nom)}
            </h1>

            <div className="flex flex-wrap gap-6 mb-10 pb-10 border-b border-ink/10">
              <Spec label="Type" value={propertyTypeLabel(listing.typeBien)} />
              {listing.pieces && <Spec label="Pièces" value={String(listing.pieces)} />}
              <Spec label="Surface" value={`${listing.surfaceM2} m²`} />
              <Spec label="Chambres" value={String(listing.chambres)} />
              <Spec label="Salles de bain" value={String(listing.sallesDeBain)} />
              {listing.wcInvites !== undefined && (
                <Spec label="WC invités" value={String(listing.wcInvites)} />
              )}
              {listing.etage && <Spec label="Étage" value={listing.etage} />}
              <Spec label="Ascenseur" value={listing.ascenseur ? "Oui" : "Non"} />
              <Spec label="Parking" value={listing.parking ? "Oui" : "Non"} />
              <Spec label="Meublé" value={listing.meuble ? "Oui" : "Non"} />
              {listing.etat && <Spec label="État" value={conditionLabel(listing.etat)} />}
              {listing.disponibilite && (
                <Spec label="Disponibilité" value={listing.disponibilite} />
              )}
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

            {(listing.caution || listing.honorairesAgence || listing.chargesIncluses !== undefined || listing.conditionsParticulieres) && (
              <>
                <h2 className="font-display text-xl text-ink mb-4">Conditions de location</h2>
                <div className="flex flex-wrap gap-6 mb-10">
                  {listing.chargesIncluses !== undefined && (
                    <Spec label="Charges / syndic" value={listing.chargesIncluses ? "Inclus" : "Non inclus"} />
                  )}
                  {listing.caution && <Spec label="Caution" value={listing.caution} />}
                  {listing.honorairesAgence && (
                    <Spec label="Honoraires d'agence" value={listing.honorairesAgence} />
                  )}
                </div>
                {listing.conditionsParticulieres && (
                  <p className="text-ink-soft text-sm mb-10 italic">
                    {listing.conditionsParticulieres}
                  </p>
                )}
              </>
            )}

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
              <ListingContactActions listing={listing} quartierNom={neighborhood?.nom} />
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

        <div className="mt-20 pt-8 border-t border-ink/10 text-center">
          <p className="text-ink-soft text-sm">
            Vous êtes propriétaire d&apos;un bien similaire ?{" "}
            <Link
              href="/confier-mon-bien"
              className="text-navy font-semibold border-b border-gold pb-0.5"
            >
              Confiez-le à Casa Habitat
            </Link>
          </p>
        </div>
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
