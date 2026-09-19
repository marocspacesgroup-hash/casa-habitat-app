import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { siteConfig } from "@/config/site";
import Analytics from "@/components/layout/Analytics";

/**
 * Polices auto-hébergées (fichiers dans src/fonts/, issus des paquets
 * @fontsource officiels). Choix délibéré plutôt que next/font/google :
 * aucune requête runtime vers un service externe, et le build ne dépend
 * pas d'un accès réseau à fonts.googleapis.com au moment du déploiement.
 */
const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces-wght-normal.woff2", style: "normal" },
    { path: "../fonts/fraunces-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = localFont({
  src: [{ path: "../fonts/manrope-wght-normal.woff2", style: "normal" }],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-mono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

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
    images: [{ url: "/images/biens/CH-0007/01.webp", alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ["/images/biens/CH-0007/01.webp"],
  },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

/**
 * Racine minimale, commune à TOUT le site — y compris /admin.
 * Le header/footer/WhatsApp/favoris du site public vivent désormais dans
 * (public)/layout.tsx, pour que /admin/login et le reste de l'admin n'en
 * héritent jamais (auparavant, la page de connexion affichait par erreur
 * la navigation publique par-dessus le formulaire).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body
        className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable} antialiased`}
      >
        {children}
        <Analytics />{/* Schema.org - Casa Habitat */}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["RealEstateAgent", "LocalBusiness"],
      "name": "Casa Habitat",
      "alternateName": "CASA Habitat",
      "description": "Agence immobilière premium à Casablanca — vente, location et gestion de biens d'exception pour une clientèle exigeante, marocaine et internationale.",
      "url": "https://www.casahabitatmaroc.com",
      "logo": "https://www.casahabitatmaroc.com/favicon.ico",
      "image": "https://www.casahabitatmaroc.com/favicon.ico",
      "telephone": [
        "+212632659054",
        "+212715028235",
        "+212600230256"
      ],
      "email": "contact@casahabitatmaroc.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Socrate, Résidence Dan Hel, 1er étage, rue 40 Attabari",
        "addressLocality": "Casablanca",
        "addressRegion": "Casablanca-Settat",
        "postalCode": "20000",
        "addressCountry": "MA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "33.5731",
        "longitude": "-7.5898"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ],
        "opens": "09:00",
        "closes": "19:00"
      },
      "areaServed": {
        "@type": "City",
        "name": "Casablanca"
      },
      "priceRange": "$$$$",
      "currenciesAccepted": "MAD",
      "paymentAccepted": "Cash, Bank Transfer, Check",
      "sameAs": []
    })
  }}
/>
      </body>
    </html>
  );
}
                                  