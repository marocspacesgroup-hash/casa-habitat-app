import Script from "next/script";

/**
 * Ne charge rien tant que NEXT_PUBLIC_GA_ID n'est pas défini dans
 * l'environnement (.env.local en développement, variables d'environnement
 * du projet sur Vercel en production). Aucun identifiant GA4 n'est codé en
 * dur ici — la première mesure réelle démarre dès que la variable est
 * renseignée, sans autre changement de code.
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
