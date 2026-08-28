import Link from "next/link";
import { Listing, TransactionType } from "@/data/types";
import { getPublishedListingsByTransaction } from "@/lib/supabase/queries";
import ListingCard from "@/components/ui/ListingCard";
import { whatsappGeneral } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";

export interface ListingFilters {
  type?: string;
  quartier?: string;
  prixMin?: string;
  prixMax?: string;
  chambres?: string;
  sdb?: string;
  surfaceMin?: string;
}

function applyFilters(items: Listing[], filters: ListingFilters) {
  return items.filter((l) => {
    if (filters.type && l.typeBien !== filters.type) return false;
    if (filters.quartier && l.quartierSlug !== filters.quartier) return false;
    if (filters.prixMin && (l.prix ?? 0) < Number(filters.prixMin)) return false;
    if (filters.prixMax && l.prix !== null && l.prix > Number(filters.prixMax))
      return false;
    if (filters.chambres && l.chambres < Number(filters.chambres)) return false;
    if (filters.sdb && l.sallesDeBain < Number(filters.sdb)) return false;
    if (filters.surfaceMin && l.surfaceM2 < Number(filters.surfaceMin))
      return false;
    return true;
  });
}

export default async function ListingsPageContent({
  transaction,
  meubleOnly,
  filters,
  title,
  emphasis,
  description,
  breadcrumb,
  whatsappCta,
}: {
  transaction: TransactionType;
  meubleOnly?: boolean;
  filters: ListingFilters;
  title: string;
  emphasis?: string;
  description: string;
  breadcrumb: string;
  /** Optionnel — affiche un CTA WhatsApp sous la description (ex. courte durée) */
  whatsappCta?: string;
}) {
  let results = await getPublishedListingsByTransaction(transaction);
  if (meubleOnly === true) results = results.filter((l) => l.meuble);
  if (meubleOnly === false) results = results.filter((l) => !l.meuble);
  results = applyFilters(results, filters);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${title} ${emphasis ?? ""}`.trim(),
    description,
    url: `${siteConfig.url}${transaction === "vente" ? "/vente" : transaction === "courte-duree" ? "/courte-duree" : "/locations"}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: results.map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/biens/${listing.slug}`,
        name: listing.titre,
      })),
    },
  };

  return (
    <section className="pt-36 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-6">
        <nav className="text-xs font-mono text-ink-soft mb-8 flex gap-2">
          <Link href="/" className="hover:text-gold">Accueil</Link>
          <span>/</span>
          <span className="text-ink">{breadcrumb}</span>
        </nav>

        <div className="max-w-2xl mb-4">
          <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
            {results.length} bien{results.length > 1 ? "s" : ""} trouvé
            {results.length > 1 ? "s" : ""}
          </span>
          <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-4">
            {title}{" "}
            {emphasis && <em className="text-gold not-italic italic">{emphasis}</em>}
          </h1>
          <p className="text-ink-soft">{description}</p>
          {whatsappCta && (
            <a
              href={whatsappGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-5 bg-gold text-navy text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-sm hover:bg-gold-bright transition-colors"
            >
              {whatsappCta}
            </a>
          )}
        </div>

        {results.length === 0 ? (
          <div className="border border-ink/10 rounded-sm p-12 text-center mt-10">
            <p className="text-ink-soft mb-2">Aucun bien ne correspond à ces critères pour le moment.</p>
            <p className="text-ink-soft text-sm">
              Contactez-nous directement — de nouveaux biens sont ajoutés régulièrement.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            {results.map((listing) => (
              <ListingCard key={listing.reference} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
