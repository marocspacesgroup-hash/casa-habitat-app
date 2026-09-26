import Link from "next/link";
import { getPublishedListings } from "@/lib/supabase/queries";
import ListingCard from "@/components/ui/ListingCard";
import SectionHead from "@/components/ui/SectionHead";
import { getServerTranslation } from "@/lib/i18n/server";
export default async function FeaturedListings() {
  const listings=await getPublishedListings(); const featured=listings.filter(l=>l.standing==="prestige").slice(0,3); const items=featured.length?featured:listings.slice(0,3); const {translation}=await getServerTranslation(); const t=translation.home;
  return <section className="py-24 md:py-28"><div className="max-w-6xl mx-auto px-6">
    <SectionHead eyebrow={t.premium} title={translation.properties.featuredTitle.split(",")[0]} emphasis={translation.properties.featuredTitle.split(",").slice(1).join(",").trim()} description={t.premiumDescription}/>
    {items.length===0?<p className="text-ink-soft">{t.comingSoon}</p>:<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">{items.map(l=><ListingCard key={l.reference} listing={l}/>)}</div>}
    <div className="mt-10"><Link href="/locations" className="text-sm font-semibold text-navy border-b border-gold pb-1">{t.allProperties}</Link></div>
  </div></section>;
}