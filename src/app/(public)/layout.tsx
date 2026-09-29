import { siteConfig } from "@/config/site";
import { headers } from "next/headers";
import { isLanguage, type Language } from "@/locales";
import { localeHeader } from "@/lib/i18n/config";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
import ChatWidget from "@/components/chat/ChatWidget";
import { FavoritesProvider } from "@/lib/favorites";

const organizationJsonLd = {
  "@type": ["RealEstateAgent", "LocalBusiness"],
  "@id": `${siteConfig.url}/#organization`,
  name: siteConfig.name,
  alternateName: "CASA Habitat",
  legalName: siteConfig.legal.denominationSociale,
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.contact.phones,
  email: siteConfig.contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.contact.address.line1,
    addressLocality: siteConfig.contact.address.city,
    addressRegion: "Casablanca-Settat",
    addressCountry: "MA",
  },
  taxID: siteConfig.legal.identifiantFiscal,
  identifier: [
    { "@type": "PropertyValue", propertyID: "RC", value: "00952402" },
    { "@type": "PropertyValue", propertyID: "ICE", value: siteConfig.legal.ice },
  ],
  areaServed: {
    "@type": "City",
    name: "Casablanca",
  },
  sameAs: Object.values(siteConfig.social).filter(Boolean),
};

const websiteJsonLd = (locale: Language) => ({
  "@type": "WebSite",
  "@id": `${siteConfig.url}/#website`,
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  publisher: { "@id": `${siteConfig.url}/#organization` },
  inLanguage: locale === "ar" ? "ar-MA" : `${locale}-MA`,
});

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(localeHeader);
  const locale: Language = isLanguage(requestedLocale) ? requestedLocale : "fr";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", "@id": `${siteConfig.url}/#organization-meta`, name: siteConfig.name },
              { "@context": "https://schema.org", ...organizationJsonLd },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...websiteJsonLd(locale) }) }}
      />
      <FavoritesProvider>
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloat />
        <ChatWidget />
      </FavoritesProvider>
    </>
  );
}
