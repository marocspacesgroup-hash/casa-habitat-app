import { siteConfig } from "@/config/site";
import { headers } from "next/headers";
import { isLanguage, type Language } from "@/locales";
import { localeHeader } from "@/lib/i18n/config";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
import ChatWidget from "@/components/chat/ChatWidget";
import { FavoritesProvider } from "@/lib/favorites";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.contact.phones[0],
  email: siteConfig.contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.contact.address.line1,
    addressLocality: siteConfig.contact.address.city,
    addressCountry: "MA",
  },
  areaServed: {
    "@type": "City",
    name: "Casablanca",
  },
  sameAs: Object.values(siteConfig.social).filter(Boolean),
};

const websiteJsonLd = (locale: Language) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  publisher: { "@type": "Organization", name: siteConfig.name },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(locale)) }}
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
