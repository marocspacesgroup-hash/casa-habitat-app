import type { Metadata } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { defaultLanguage, getPreferredLocale, localeCookie, localeHeader, type Language } from "./config";

const seo = {
  fr: {
    home: ["Agence immobilière à Casablanca", "Casa Habitat accompagne la vente, la location et l'investissement immobilier à Casablanca, pour une clientèle marocaine et internationale."],
    locations: ["Locations à Casablanca", "Appartements, studios et villas à louer à Casablanca, meublés et non meublés, sélectionnés par Casa Habitat."],
    furnished: ["Locations meublées à Casablanca", "Appartements et studios meublés à louer à Casablanca avec Casa Habitat."],
    unfurnished: ["Locations vides à Casablanca", "Appartements et villas non meublés à louer à Casablanca avec Casa Habitat."],
    sales: ["Biens à vendre à Casablanca", "Appartements, villas et bureaux à vendre à Casablanca, sélection Casa Habitat."],
    shortStay: ["Locations courte durée à Casablanca", "Appartements et studios meublés pour des séjours courts à Casablanca."],
    neighborhoods: ["Quartiers de Casablanca", "Découvrez les quartiers de Casablanca couverts par Casa Habitat et leurs opportunités immobilières."],
    about: ["À propos", "Casa Habitat, agence immobilière premium à Casablanca, spécialisée en vente, location, gestion et conseil immobilier."],
    contact: ["Contact", "Contactez Casa Habitat à Casablanca par téléphone, e-mail ou WhatsApp."],
    estimation: ["Estimation gratuite", "Demandez une estimation gratuite de votre bien à Casablanca avec Casa Habitat."],
    owner: ["Confier un bien à Casa Habitat", "Propriétaire à Casablanca ? Casa Habitat vous accompagne pour estimer, vendre ou louer votre bien."],
    legal: ["Mentions légales", "Mentions légales de Casa Habitat."],
    privacy: ["Politique de confidentialité", "Politique de confidentialité de Casa Habitat."],
    favorites: ["Mes favoris", "Vos biens enregistrés en favoris sur Casa Habitat."],
  },
  en: {
    home: ["Real estate agency in Casablanca", "Casa Habitat supports sales, rentals and real estate investment in Casablanca for Moroccan and international clients."],
    locations: ["Property rentals in Casablanca", "Apartments, studios and villas for rent in Casablanca, furnished and unfurnished, selected by Casa Habitat."],
    furnished: ["Furnished rentals in Casablanca", "Furnished apartments and studios for rent in Casablanca with Casa Habitat."],
    unfurnished: ["Unfurnished rentals in Casablanca", "Unfurnished apartments and villas for rent in Casablanca with Casa Habitat."],
    sales: ["Properties for sale in Casablanca", "Apartments, villas and offices for sale in Casablanca, selected by Casa Habitat."],
    shortStay: ["Short-term rentals in Casablanca", "Furnished apartments and studios for short stays in Casablanca."],
    neighborhoods: ["Casablanca neighborhoods", "Explore Casablanca neighborhoods covered by Casa Habitat and their real estate opportunities."],
    about: ["About Casa Habitat", "Casa Habitat is a premium real estate agency in Casablanca specializing in sales, rentals, management and property advice."],
    contact: ["Contact Casa Habitat", "Contact Casa Habitat in Casablanca by phone, email or WhatsApp."],
    estimation: ["Free property valuation", "Request a free property valuation in Casablanca with Casa Habitat."],
    owner: ["List your property with Casa Habitat", "Are you a property owner in Casablanca? Casa Habitat can help you value, sell or rent your property."],
    legal: ["Legal notice", "Legal notice for Casa Habitat."],
    privacy: ["Privacy policy", "Casa Habitat privacy policy."],
    favorites: ["My favorites", "Your saved properties on Casa Habitat."],
  },
  ar: {
    home: ["وكالة عقارية في الدار البيضاء", "ترافقك كازا هابيتات في بيع وتأجير واستثمار العقارات في الدار البيضاء للعملاء المغاربة والدوليين."],
    locations: ["عقارات للإيجار في الدار البيضاء", "شقق واستوديوهات وفلل للإيجار في الدار البيضاء، مفروشة وغير مفروشة، مختارة من كازا هابيتات."],
    furnished: ["شقق مفروشة للإيجار في الدار البيضاء", "شقق واستوديوهات مفروشة للإيجار في الدار البيضاء مع كازا هابيتات."],
    unfurnished: ["شقق غير مفروشة للإيجار في الدار البيضاء", "شقق وفلل غير مفروشة للإيجار في الدار البيضاء مع كازا هابيتات."],
    sales: ["عقارات للبيع في الدار البيضاء", "شقق وفلل ومكاتب للبيع في الدار البيضاء، مختارة من كازا هابيتات."],
    shortStay: ["إيجارات قصيرة المدة في الدار البيضاء", "شقق واستوديوهات مفروشة للإقامات القصيرة في الدار البيضاء."],
    neighborhoods: ["أحياء الدار البيضاء", "اكتشف أحياء الدار البيضاء التي تغطيها كازا هابيتات والفرص العقارية فيها."],
    about: ["من نحن", "كازا هابيتات وكالة عقارية راقية في الدار البيضاء متخصصة في البيع والإيجار والإدارة والاستشارات العقارية."],
    contact: ["اتصل بنا", "تواصل مع كازا هابيتات في الدار البيضاء عبر الهاتف أو البريد الإلكتروني أو واتساب."],
    estimation: ["تقييم عقاري مجاني", "اطلب تقييماً مجانياً لعقارك في الدار البيضاء مع كازا هابيتات."],
    owner: ["اعرض عقارك مع كازا هابيتات", "هل أنت مالك عقار في الدار البيضاء؟ تساعدك كازا هابيتات في تقييم عقارك أو بيعه أو تأجيره."],
    legal: ["الإشعار القانوني", "الإشعار القانوني لكازا هابيتات."],
    privacy: ["سياسة الخصوصية", "سياسة الخصوصية لكازا هابيتات."],
    favorites: ["المفضلة", "العقارات التي حفظتها في كازا هابيتات."],
  },
  es: {
    home: ["Agencia inmobiliaria en Casablanca", "Casa Habitat acompaña la venta, el alquiler y la inversión inmobiliaria en Casablanca para clientes marroquíes e internacionales."],
    locations: ["Alquileres en Casablanca", "Apartamentos, estudios y villas en alquiler en Casablanca, amueblados y sin amueblar, seleccionados por Casa Habitat."],
    furnished: ["Alquileres amueblados en Casablanca", "Apartamentos y estudios amueblados en alquiler en Casablanca con Casa Habitat."],
    unfurnished: ["Alquileres sin amueblar en Casablanca", "Apartamentos y villas sin amueblar en alquiler en Casablanca con Casa Habitat."],
    sales: ["Propiedades en venta en Casablanca", "Apartamentos, villas y oficinas en venta en Casablanca, seleccionados por Casa Habitat."],
    shortStay: ["Alquileres de corta duración en Casablanca", "Apartamentos y estudios amueblados para estancias cortas en Casablanca."],
    neighborhoods: ["Barrios de Casablanca", "Descubre los barrios de Casablanca cubiertos por Casa Habitat y sus oportunidades inmobiliarias."],
    about: ["Sobre Casa Habitat", "Casa Habitat es una agencia inmobiliaria premium en Casablanca especializada en venta, alquiler, gestión y asesoramiento."],
    contact: ["Contacto", "Contacta con Casa Habitat en Casablanca por teléfono, correo electrónico o WhatsApp."],
    estimation: ["Valoración inmobiliaria gratuita", "Solicita una valoración gratuita de tu propiedad en Casablanca con Casa Habitat."],
    owner: ["Confía tu propiedad a Casa Habitat", "Si eres propietario en Casablanca, Casa Habitat puede ayudarte a valorar, vender o alquilar tu propiedad."],
    legal: ["Aviso legal", "Aviso legal de Casa Habitat."],
    privacy: ["Política de privacidad", "Política de privacidad de Casa Habitat."],
    favorites: ["Mis favoritos", "Tus propiedades guardadas en Casa Habitat."],
  },
  it: {
    home: ["Agenzia immobiliare a Casablanca", "Casa Habitat supporta vendita, affitto e investimento immobiliare a Casablanca per clienti marocchini e internazionali."],
    locations: ["Immobili in affitto a Casablanca", "Appartamenti, monolocali e ville in affitto a Casablanca, arredati e non arredati, selezionati da Casa Habitat."],
    furnished: ["Affitti arredati a Casablanca", "Appartamenti e monolocali arredati in affitto a Casablanca con Casa Habitat."],
    unfurnished: ["Affitti non arredati a Casablanca", "Appartamenti e ville non arredati in affitto a Casablanca con Casa Habitat."],
    sales: ["Immobili in vendita a Casablanca", "Appartamenti, ville e uffici in vendita a Casablanca, selezionati da Casa Habitat."],
    shortStay: ["Affitti brevi a Casablanca", "Appartamenti e monolocali arredati per soggiorni brevi a Casablanca."],
    neighborhoods: ["Quartieri di Casablanca", "Scopri i quartieri di Casablanca coperti da Casa Habitat e le opportunità immobiliari."],
    about: ["Chi siamo", "Casa Habitat è un'agenzia immobiliare premium a Casablanca specializzata in vendita, affitto, gestione e consulenza."],
    contact: ["Contatti", "Contatta Casa Habitat a Casablanca per telefono, e-mail o WhatsApp."],
    estimation: ["Valutazione immobiliare gratuita", "Richiedi una valutazione gratuita del tuo immobile a Casablanca con Casa Habitat."],
    owner: ["Affida il tuo immobile a Casa Habitat", "Sei proprietario a Casablanca? Casa Habitat ti aiuta a valutare, vendere o affittare il tuo immobile."],
    legal: ["Note legali", "Note legali di Casa Habitat."],
    privacy: ["Privacy policy", "Privacy policy di Casa Habitat."],
    favorites: ["I miei preferiti", "I tuoi immobili salvati su Casa Habitat."],
  },
} as const;

type SeoKey = keyof typeof seo.fr;

async function requestLocale(): Promise<Language> {
  const h = await headers();
  const headerLocale = h.get(localeHeader);
  if (headerLocale && Object.prototype.hasOwnProperty.call(seo, headerLocale)) {
    return headerLocale as Language;
  }
  return getPreferredLocale(h.get(localeCookie) ?? undefined, h.get("accept-language"));
}

export async function getPageMetadata(key: SeoKey, pathname: string): Promise<Metadata> {
  const locale = await requestLocale();
  const [title, description] = seo[locale][key];
  const languageAlternates = Object.fromEntries(
    Object.keys(seo).map((lang) => [lang, `/${lang}${pathname === "/" ? "" : pathname}`])
  );

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${pathname === "/" ? "" : pathname}`,
      languages: {
        ...languageAlternates,
        "x-default": pathname === "/" ? "/" : pathname,
      },
    },
    openGraph: {
      locale: locale === "ar" ? "ar_MA" : `${locale}_MA`,
      title,
      description,
      url: `${siteConfig.url}/${locale}${pathname === "/" ? "" : pathname}`,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export const defaultMetadataLocale = defaultLanguage;

export async function getDynamicMetadata(
  title: string,
  description: string,
  pathname: string
): Promise<Metadata> {
  const locale = await requestLocale();
  const localizedPath = `/${locale}${pathname === "/" ? "" : pathname}`;
  const languages = Object.fromEntries(
    Object.keys(seo).map((lang) => [lang, `/${lang}${pathname === "/" ? "" : pathname}`])
  );
  return {
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: { ...languages, "x-default": pathname },
    },
    openGraph: {
      locale: locale === "ar" ? "ar_MA" : `${locale}_MA`,
      title,
      description,
      url: `${siteConfig.url}${localizedPath}`,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}
