import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
import { FavoritesProvider } from "@/lib/favorites";

const fraunces = { variable: "font-fraunces-stub" };
const manrope = { variable: "font-manrope-stub" };
const plexMono = { variable: "font-plexmono-stub" };

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body
        className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
