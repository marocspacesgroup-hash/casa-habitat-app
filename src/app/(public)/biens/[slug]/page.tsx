import type { Metadata } from "next";
import { getDynamicMetadata } from "@/lib/i18n/metadata";
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
import PropertyGallery from "@/components/ui/PropertyGallery";
import ListingContactActions from "@/components/ui/ListingContactActions";
import ListingViewTracker from "@/components/ui/ListingViewTracker";
import { getServerTranslation } from "@/lib/i18n/server";
import { prefixLocale } from "@/lib/i18n/config";

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
  const base = await getDynamicMetadata(title, metaDescription, `/biens/${listing.slug}`);
  return {
    ...base,
    openGraph: { ...base.openGraph, title: `${title} | ${siteConfig.name}`, type: "article", images: ogImage },
    twitter: { card: "summary_large_image", title, description: metaDescription, images: ogImage },
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

  const { translation, locale } = await getServerTranslation();
  const t = translation.pages.listingDetail;

  const [neighborhood, similar] = await Promise.all([
    getNeighborhoodBySlug(listing.quartierSlug),
    getSimilarPublishedListings(listing),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: seoTitle(listing, neighborhood?.nom),
    url: `${siteConfig.url}/${locale}/biens/${listing.slug}`,
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
      url: `${siteConfig.url}/${locale}/biens/${listing.slug}`,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t.home,
        item: `${siteConfig.url}${prefixLocale("/", locale)}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: transactionLabel(listing.transaction),
        item: `${siteConfig.url}${prefixLocale(
          listing.transaction === "vente" ? "/vente" : "/locations",
          locale
        )}`,
      },
      { "@type": "ListItem", position: 3, name: listing.titre },
    ],
  };

  // Place l'image principale en premier sans perdre les autres photos, même
  // lorsque l'admin a choisi une photo qui n'est pas la première positionnée.
  const primaryPhoto = listing.imagePrincipale.kind === "photo"
    ? listing.imagePrincipale
    : null;
  const primaryIndex = primaryPhoto
    ? listing.images.findIndex(
        (img) => img.kind === "photo" && img.src === primaryPhoto.src
      )
    : 0;
  const galleryImages = listing.images.length > 0
    ? [
        listing.imagePrincipale,
        ...listing.images.filter((_, index) => index !== primaryIndex),
      ]
    : [listing.imagePrincipale];
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
          <Link href={prefixLocale("/", locale)} className="hover:text-gold">{t.home}</Link>
          <span>/</span>
          <Link
            href={prefixLocale(listing.transaction === "vente" ? "/vente" : "/locations", locale)}
            className="hover:text-gold"
          >
            {transactionLabel(listing.transaction)}
          </Link>
          <span>/</span>
          <span className="text-ink">{listing.titre}</span>
        </nav>

        {listing.isSample && (
          <div className="bg-navy/5 border border-navy/15 text-ink-soft text-sm px-4 py-3 rounded-sm mb-8">
            {t.sample}
          </div>
        )}

        {/* Galerie */}
        <PropertyGallery images={galleryImages} />

        <div className="grid lg:grid-cols-3 gap-14">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-gold">
                {neighborhood?.nom ?? listing.ville} · {t.reference} {listing.reference}
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
              <Spec label={t.type} value={propertyTypeLabel(listing.typeBien)} />
              {listing.pieces && <Spec label={t.rooms} value={String(listing.pieces)} />}
              <Spec label="Surface" value={`${listing.surfaceM2} m²`} />
              <Spec label={t.bedrooms} value={String(listing.chambres)} />
              <Spec label={t.bathrooms} value={String(listing.sallesDeBain)} />
              {listing.wcInvites !== undefined && (
                <Spec label={t.guestWc} value={String(listing.wcInvites)} />
              )}
              {listing.etage && <Spec label={t.floor} value={listing.etage} />}
              <Spec label={t.elevator} value={listing.ascenseur ? "Oui" : "Non"} />
              <Spec label={t.parking} value={listing.parking ? "Oui" : "Non"} />
              <Spec label={t.furnished} value={listing.meuble ? "Oui" : "Non"} />
              {listing.etat && <Spec label={t.condition} value={conditionLabel(listing.etat)} />}
              {listing.disponibilite && (
                <Spec label={t.availability} value={listing.disponibilite} />
              )}
            </div>

            <h2 className="font-display text-xl text-ink mb-4">{t.description}</h2>
            <p className="text-ink-soft mb-10 leading-relaxed">{listing.description}</p>

            <h2 className="font-display text-xl text-ink mb-4">{t.equipment}</h2>
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
                <h2 className="font-display text-xl text-ink mb-4">{t.rentalConditions}</h2>
                <div className="flex flex-wrap gap-6 mb-10">
                  {listing.chargesIncluses !== undefined && (
                    <Spec label={t.charges} value={listing.chargesIncluses ? t.included : t.notIncluded} />
                  )}
                  {listing.caution && <Spec label={t.deposit} value={listing.caution} />}
                  {listing.honorairesAgence && (
                    <Spec label={t.agencyFees} value={listing.honorairesAgence} />
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
                  {t.aboutNeighborhood}
                </h2>
                <p className="text-ink-soft mb-2">{neighborhood.description}</p>
                <Link
                  href={prefixLocale(`/quartiers/${neighborhood.slug}`, locale)}
                  className="text-sm font-semibold text-navy border-b border-gold pb-0.5"
                >
                  {t.discover} {neighborhood.nom} →
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
              <ListingContactActions
                listing={{ reference: listing.reference, ville: listing.ville }}
                quartierNom={neighborhood?.nom}
              />
            </div>

            <div className="border-t border-ivory/15 pt-6">
              <div className="eyebrow text-gold mb-3">{t.share}</div>
              <ShareButtons title={listing.titre} />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="mt-24">
            <h2 className="font-display text-2xl text-ink mb-8">{t.similar}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {similar.map((l) => (
                <ListingCard key={l.reference} listing={l} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-20 pt-8 border-t border-ink/10 text-center">
          <p className="text-ink-soft text-sm">
            {t.ownerQuestion}{" "}
            <Link
              href={prefixLocale("/confier-mon-bien", locale)}
              className="text-navy font-semibold border-b border-gold pb-0.5"
            >
              {t.ownerCta}
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
