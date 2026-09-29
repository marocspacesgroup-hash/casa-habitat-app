import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerLocale } from "@/lib/i18n/server";
import { prefixLocale, type Language } from "@/lib/i18n/config";
import {
  getListingTranslation,
  getListingTranslatedLocales,
  getPublishedListingBySlug,
  getSimilarPublishedListings,
  getNeighborhoodBySlug,
} from "@/lib/supabase/queries";
import {
  conditionLabel,
  formatPrice,
  propertyTypeLabel,
  seoTitle,
} from "@/lib/format";
import { siteConfig } from "@/config/site";
import ListingCard from "@/components/ui/ListingCard";
import ShareButtons from "@/components/ui/ShareButtons";
import PropertyGallery from "@/components/ui/PropertyGallery";
import ListingContactActions from "@/components/ui/ListingContactActions";
import ListingViewTracker from "@/components/ui/ListingViewTracker";

const listingUi: Record<Language, Record<string, string>> = {
  fr: {type:"Type",rooms:"Pièces",surface:"Surface",bedrooms:"Chambres",bathrooms:"Salles de bain",guestWc:"WC invités",floor:"Étage",elevator:"Ascenseur",parking:"Parking",furnished:"Meublé",condition:"État",availability:"Disponibilité",yes:"Oui",no:"Non",description:"Description",equipment:"Équipements",rentalConditions:"Conditions de location",charges:"Charges / syndic",included:"Inclus",notIncluded:"Non inclus",deposit:"Caution",agencyFees:"Honoraires d'agence",aboutNeighborhood:"À propos du quartier",discoverNeighborhood:"Découvrir le quartier →",similar:"Biens similaires",ownerCta:"Vous êtes propriétaire d'un bien similaire ?",entrust:"Confiez-le à Casa Habitat",reference:"Réf.",share:"Partager",home:"Accueil",notAvailable:"Bien non disponible",example:"Fiche présentée à titre d'exemple."},
  en: {type:"Type",rooms:"Rooms",surface:"Area",bedrooms:"Bedrooms",bathrooms:"Bathrooms",guestWc:"Guest WC",floor:"Floor",elevator:"Elevator",parking:"Parking",furnished:"Furnished",condition:"Condition",availability:"Availability",yes:"Yes",no:"No",description:"Description",equipment:"Amenities",rentalConditions:"Rental terms",charges:"Building charges",included:"Included",notIncluded:"Not included",deposit:"Deposit",agencyFees:"Agency fees",aboutNeighborhood:"About the neighborhood",discoverNeighborhood:"Discover the neighborhood →",similar:"Similar properties",ownerCta:"Do you own a similar property?",entrust:"Entrust it to Casa Habitat",reference:"Ref.",share:"Share",home:"Home",notAvailable:"Property unavailable",example:"Example listing."},
  ar: {type:"النوع",rooms:"الغرف",surface:"المساحة",bedrooms:"غرف النوم",bathrooms:"الحمامات",guestWc:"مرحاض للضيوف",floor:"الطابق",elevator:"مصعد",parking:"موقف سيارات",furnished:"مفروش",condition:"الحالة",availability:"التوفر",yes:"نعم",no:"لا",description:"الوصف",equipment:"التجهيزات",rentalConditions:"شروط الإيجار",charges:"رسوم العمارة",included:"مشمولة",notIncluded:"غير مشمولة",deposit:"الضمان",agencyFees:"أتعاب الوكالة",aboutNeighborhood:"عن الحي",discoverNeighborhood:"اكتشف الحي ←",similar:"عقارات مشابهة",ownerCta:"هل تملك عقارًا مشابهًا؟",entrust:"أوكل العقار إلى Casa Habitat",reference:"المرجع",share:"مشاركة",home:"الرئيسية",notAvailable:"العقار غير متاح",example:"إعلان تجريبي."},
  es: {type:"Tipo",rooms:"Habitaciones",surface:"Superficie",bedrooms:"Dormitorios",bathrooms:"Baños",guestWc:"Aseo de invitados",floor:"Planta",elevator:"Ascensor",parking:"Parking",furnished:"Amueblado",condition:"Estado",availability:"Disponibilidad",yes:"Sí",no:"No",description:"Descripción",equipment:"Equipamiento",rentalConditions:"Condiciones de alquiler",charges:"Gastos de comunidad",included:"Incluidos",notIncluded:"No incluidos",deposit:"Fianza",agencyFees:"Honorarios de agencia",aboutNeighborhood:"Sobre el barrio",discoverNeighborhood:"Descubrir el barrio →",similar:"Propiedades similares",ownerCta:"¿Es propietario de una propiedad similar?",entrust:"Confíela a Casa Habitat",reference:"Ref.",share:"Compartir",home:"Inicio",notAvailable:"Propiedad no disponible",example:"Anuncio de ejemplo."},
  it: {type:"Tipo",rooms:"Locali",surface:"Superficie",bedrooms:"Camere",bathrooms:"Bagni",guestWc:"WC ospiti",floor:"Piano",elevator:"Ascensore",parking:"Parcheggio",furnished:"Arredato",condition:"Condizione",availability:"Disponibilità",yes:"Sì",no:"No",description:"Descrizione",equipment:"Dotazioni",rentalConditions:"Condizioni di affitto",charges:"Spese condominiali",included:"Incluse",notIncluded:"Non incluse",deposit:"Cauzione",agencyFees:"Commissioni d'agenzia",aboutNeighborhood:"Sul quartiere",discoverNeighborhood:"Scopri il quartiere →",similar:"Immobili simili",ownerCta:"Sei proprietario di un immobile simile?",entrust:"Affidalo a Casa Habitat",reference:"Rif.",share:"Condividi",home:"Home",notAvailable:"Immobile non disponibile",example:"Annuncio di esempio."},
} as const;

const transactionLabels: Record<Language, Record<string, string>> = {
  fr: { location: "Location", vente: "Vente", "courte-duree": "Courte durée" },
  en: { location: "Rental", vente: "For sale", "courte-duree": "Short stay" },
  ar: { location: "إيجار", vente: "للبيع", "courte-duree": "إقامة قصيرة" },
  es: { location: "Alquiler", vente: "Venta", "courte-duree": "Corta estancia" },
  it: { location: "Affitto", vente: "Vendita", "courte-duree": "Affitto breve" },
} as const;

const statusLabels: Record<Language, Record<string, string>> = {
  fr: { reserve: "Réservé", loue: "Loué", vendu: "Vendu" },
  en: { reserve: "Reserved", loue: "Rented", vendu: "Sold" },
  ar: { reserve: "محجوز", loue: "مؤجر", vendu: "مباع" },
  es: { reserve: "Reservado", loue: "Alquilado", vendu: "Vendido" },
  it: { reserve: "Prenotato", loue: "Affittato", vendu: "Venduto" },
} as const;

const conditionLabels: Record<Language, Record<string, string>> = {
  fr: { neuf: "Neuf", "excellent-etat": "Excellent état", "bon-etat": "Bon état", "a-rafraichir": "À rafraîchir", "a-renover": "À rénover" },
  en: { neuf: "New", "excellent-etat": "Excellent condition", "bon-etat": "Good condition", "a-rafraichir": "Needs refresh", "a-renover": "Needs renovation" },
  ar: { neuf: "جديد", "excellent-etat": "حالة ممتازة", "bon-etat": "حالة جيدة", "a-rafraichir": "يحتاج إلى تجديد خفيف", "a-renover": "يحتاج إلى تجديد" },
  es: { neuf: "Nuevo", "excellent-etat": "Excelente estado", "bon-etat": "Buen estado", "a-rafraichir": "Necesita actualización", "a-renover": "Necesita reforma" },
  it: { neuf: "Nuovo", "excellent-etat": "Ottime condizioni", "bon-etat": "Buone condizioni", "a-rafraichir": "Da rinfrescare", "a-renover": "Da ristrutturare" },
} as const;

function transactionLabel(transaction: string, locale: Language) {
  return transactionLabels[locale][transaction] ?? transaction;
}

function localizedPath(locale: string, path: string) {
  return prefixLocale(path, locale as Language);
}

function availabilitySchema(status: string) {
  if (status === "disponible") return "https://schema.org/InStock";
  if (status === "reserve") return "https://schema.org/LimitedAvailability";
  return "https://schema.org/OutOfStock";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const listing = await getPublishedListingBySlug(slug, locale);
  if (!listing) return {};

  const translation = await getListingTranslation(listing.id, locale);
  const translatedLocales = await getListingTranslatedLocales(listing.id);
  const isLocalized = locale === "fr" || Boolean(translation);
  const neighborhood = await getNeighborhoodBySlug(listing.quartierSlug);
  const title = seoTitle(listing, neighborhood?.nom);
  const metaDescription =
    listing.transaction === "courte-duree"
      ? `${title}. ${listing.surfaceM2} m²${listing.meuble ? ", furnished" : ""}${listing.parking ? ", parking" : ""}. ${listing.description.slice(0, 135)}${listing.description.length > 135 ? "…" : ""}`
      : `${title}. ${listing.surfaceM2} m²${listing.chambres > 0 ? `, ${listing.chambres} ${listing.chambres > 1 ? "bedrooms" : "bedroom"}` : ""}${listing.meuble ? ", furnished" : ""}${listing.parking ? ", parking" : ""}. ${listing.description.slice(0, 135)}${listing.description.length > 135 ? "…" : ""}`;
  const canonical = `${siteConfig.url}/${locale}/biens/${listing.slug}`;
  const languageAlternates = isLocalized
    ? Object.fromEntries(
        ["fr", ...translatedLocales.filter((translatedLocale) => translatedLocale !== "fr")].map(
          (translatedLocale) => [
            translatedLocale,
            `${siteConfig.url}/${translatedLocale}/biens/${listing.slug}`,
          ]
        )
      )
    : undefined;

  return {
    title,
    description: metaDescription,
    robots: listing.statut === "loue" || listing.statut === "vendu"
      ? { index: false, follow: true }
      : isLocalized
        ? { index: true, follow: true }
        : { index: false, follow: true },
    alternates: {
      canonical,
      ...(languageAlternates
        ? { languages: { ...languageAlternates, "x-default": `${siteConfig.url}/fr/biens/${listing.slug}` } }
        : {}),
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description: metaDescription,
      url: canonical,
      siteName: siteConfig.name,
      type: "article",
      locale: locale === "ar" ? "ar_MA" : `${locale}_MA`,
      images:
        listing.imagePrincipale.kind === "photo"
          ? [{
              url: new URL(listing.imagePrincipale.src, siteConfig.url).toString(),
              width: listing.imagePrincipale.width,
              height: listing.imagePrincipale.height,
              alt: listing.imagePrincipale.alt,
            }]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images:
        listing.imagePrincipale.kind === "photo"
          ? [new URL(listing.imagePrincipale.src, siteConfig.url).toString()]
          : undefined,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = listingUi[locale];
  const listing = await getPublishedListingBySlug(slug, locale);
  if (!listing) notFound();

  const localizedTranslation = await getListingTranslation(listing.id, locale);
  const isLocalized = locale === "fr" || Boolean(localizedTranslation);

  const [neighborhood, similar] = await Promise.all([
    getNeighborhoodBySlug(listing.quartierSlug),
    getSimilarPublishedListings(listing, 3, locale),
  ]);

  const title = seoTitle(listing, neighborhood?.nom);
  const canonical = `${siteConfig.url}/${locale}/biens/${listing.slug}`;
  const primaryImage =
    listing.imagePrincipale.kind === "photo"
      ? new URL(listing.imagePrincipale.src, siteConfig.url).toString()
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${canonical}#listing`,
    name: title,
    url: canonical,
    mainEntityOfPage: canonical,
    provider: { "@id": `${siteConfig.url}/#organization` },
    description: listing.description,
    sku: listing.reference,
    ...(primaryImage ? { image: primaryImage } : {}),
    dateModified: listing.dateMiseAJour,
    about: {
      "@type": "Place",
      name: neighborhood?.nom ?? listing.ville,
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: t.type, value: propertyTypeLabel(listing.typeBien) },
      { "@type": "PropertyValue", name: t.surface, value: `${listing.surfaceM2} m²` },
      { "@type": "PropertyValue", name: t.bedrooms, value: String(listing.chambres) },
      { "@type": "PropertyValue", name: t.bathrooms, value: String(listing.sallesDeBain) },
      { "@type": "PropertyValue", name: t.furnished, value: listing.meuble ? t.yes : t.no },
      { "@type": "PropertyValue", name: t.parking, value: listing.parking ? t.yes : t.no },
    ],
    offers: {
      "@type": "Offer",
      ...(listing.prix !== null ? { price: listing.prix } : {}),
      priceCurrency: "MAD",
      availability: availabilitySchema(listing.statut),
      url: canonical,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.home, item: `${siteConfig.url}/${locale}` },
      {
        "@type": "ListItem",
        position: 2,
        name: transactionLabel(listing.transaction, locale),
        item: `${siteConfig.url}${localizedPath(locale, listing.transaction === "vente" ? "/vente" : "/locations")}`,
      },
      ...(neighborhood
        ? [{
            "@type": "ListItem",
            position: 3,
            name: neighborhood.nom,
            item: `${siteConfig.url}${localizedPath(locale, `/quartiers/${neighborhood.slug}`)}`,
          }]
        : []),
      { "@type": "ListItem", position: neighborhood ? 4 : 3, name: title, item: canonical },
    ],
  };

  const primaryPhoto = listing.imagePrincipale.kind === "photo" ? listing.imagePrincipale : null;
  const primaryIndex = primaryPhoto
    ? listing.images.findIndex((img) => img.kind === "photo" && img.src === primaryPhoto.src)
    : 0;
  const galleryImages = listing.images.length > 0
    ? [listing.imagePrincipale, ...listing.images.filter((_, index) => index !== primaryIndex)]
    : [listing.imagePrincipale];

  return (
    <div className="pt-32 pb-24">
      <ListingViewTracker reference={listing.reference} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8 flex gap-2 flex-wrap">
          <Link href={localizedPath(locale, "/")} className="hover:text-gold">{t.home}</Link>
          <span>/</span>
          <Link
            href={localizedPath(locale, listing.transaction === "vente" ? "/vente" : "/locations")}
            className="hover:text-gold"
          >
            {transactionLabel(listing.transaction, locale)}
          </Link>
          {neighborhood && (
            <>
              <span>/</span>
              <Link href={localizedPath(locale, `/quartiers/${neighborhood.slug}`)} className="hover:text-gold">
                {neighborhood.nom}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink">{title}</span>
        </nav>

        {!isLocalized && locale !== "fr" && (
          <div className="bg-navy/5 border border-navy/15 text-ink-soft text-sm px-4 py-3 rounded-sm mb-8">
            {t.example} — {locale.toUpperCase()} translation is not yet available for this property.
          </div>
        )}

        {listing.statut !== "disponible" && (
          <div className="bg-navy/5 border border-navy/15 text-ink-soft text-sm px-4 py-3 rounded-sm mb-8">
            {statusLabels[locale][listing.statut] ?? t.notAvailable}
          </div>
        )}

        <PropertyGallery images={galleryImages} />

        <div className="grid lg:grid-cols-3 gap-14">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-gold">
                {neighborhood?.nom ?? listing.ville} · {t.reference} {listing.reference}
              </div>
            </div>
            <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-6">{title}</h1>

            <div className="flex flex-wrap gap-6 mb-10 pb-10 border-b border-ink/10">
              <Spec label={t.type} value={propertyTypeLabel(listing.typeBien)} />
              {listing.pieces && <Spec label={t.rooms} value={String(listing.pieces)} />}
              <Spec label={t.surface} value={`${listing.surfaceM2} m²`} />
              <Spec label={t.bedrooms} value={String(listing.chambres)} />
              <Spec label={t.bathrooms} value={String(listing.sallesDeBain)} />
              {listing.wcInvites !== undefined && <Spec label={t.guestWc} value={String(listing.wcInvites)} />}
              {listing.etage && <Spec label={t.floor} value={listing.etage} />}
              <Spec label={t.elevator} value={listing.ascenseur ? t.yes : t.no} />
              <Spec label={t.parking} value={listing.parking ? t.yes : t.no} />
              <Spec label={t.furnished} value={listing.meuble ? t.yes : t.no} />
              {listing.etat && (
                <Spec
                  label={t.condition}
                  value={conditionLabels[locale][listing.etat] ?? conditionLabel(listing.etat)}
                />
              )}
              {listing.disponibilite && <Spec label={t.availability} value={listing.disponibilite} />}
            </div>

            <h2 className="font-display text-xl text-ink mb-4">{t.description}</h2>
            <p className="text-ink-soft mb-10 leading-relaxed whitespace-pre-line">{listing.description}</p>

            <h2 className="font-display text-xl text-ink mb-4">{t.equipment}</h2>
            <div className="flex flex-wrap gap-2 mb-10">
              {listing.equipements.map((eq) => (
                <span key={eq} className="text-xs font-mono uppercase tracking-wide border border-ink/15 rounded-sm px-3 py-1.5 text-ink-soft">
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
                  {listing.honorairesAgence && <Spec label={t.agencyFees} value={listing.honorairesAgence} />}
                </div>
                {listing.conditionsParticulieres && <p className="text-ink-soft text-sm mb-10 italic whitespace-pre-line">{listing.conditionsParticulieres}</p>}
              </>
            )}

            {neighborhood && (
              <>
                <h2 className="font-display text-xl text-ink mb-4">{t.aboutNeighborhood}</h2>
                <p className="text-ink-soft mb-2">{neighborhood.description}</p>
                <Link href={localizedPath(locale, `/quartiers/${neighborhood.slug}`)} className="text-sm font-semibold text-navy border-b border-gold pb-0.5">
                  {t.discoverNeighborhood}
                </Link>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 h-fit bg-navy rounded-sm p-8">
            <div className="font-display text-2xl text-ivory mb-1">{formatPrice(listing)}</div>
            <div className="text-ivory/50 text-sm mb-8">{transactionLabel(listing.transaction, locale as keyof typeof transactionLabels)}</div>
            <div className="flex flex-col gap-3 mb-8">
              <ListingContactActions listing={{ reference: listing.reference, ville: listing.ville }} quartierNom={neighborhood?.nom} />
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
              {similar.map((l) => <ListingCard key={l.reference} listing={l} />)}
            </div>
          </div>
        )}

        <div className="mt-20 pt-8 border-t border-ink/10 text-center">
          <p className="text-ink-soft text-sm">
            {t.ownerCta}{" "}
            <Link href={localizedPath(locale, "/confier-mon-bien")} className="text-navy font-semibold border-b border-gold pb-0.5">
              {t.entrust}
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
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-1">{label}</div>
      <div className="text-ink font-medium">{value}</div>
    </div>
  );
}
