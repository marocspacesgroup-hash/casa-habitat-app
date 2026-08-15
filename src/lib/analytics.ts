declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Envoie un événement à GA4 si le script est chargé (voir Analytics.tsx —
 * ne se charge que si NEXT_PUBLIC_GA_ID est renseigné). Ne fait rien sinon :
 * ces appels sont sans danger même sans analytics configuré.
 */
export function trackEvent(
  name:
    | "whatsapp_click"
    | "phone_click"
    | "form_submit"
    | "owner_cta_click"
    | "listing_view"
    | "property_search",
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}
