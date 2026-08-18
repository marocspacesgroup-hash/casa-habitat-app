import { siteConfig } from "@/config/site";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
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
};

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FavoritesProvider>
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloat />
      </FavoritesProvider>
    </>
  );
}
