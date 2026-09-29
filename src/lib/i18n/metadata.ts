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
    management: ["Gestion locative à Casablanca", "Confiez la gestion de votre bien à Casablanca à Casa Habitat : positionnement, commercialisation, sélection des dossiers et suivi."],
    letProperty: ["Mettre son bien en location à Casablanca", "Propriétaire à Casablanca ? Préparez, positionnez et commercialisez votre bien avec un accompagnement adapté."],
    sellProperty: ["Vendre son bien immobilier à Casablanca", "Préparez la vente de votre appartement, villa ou autre bien à Casablanca avec une stratégie de positionnement et de commercialisation."],
    shortStayOwner: ["Location courte durée à Casablanca pour propriétaires", "Étudiez le potentiel de votre bien pour la courte durée à Casablanca avec une approche fondée sur ses caractéristiques et le marché."],
    remoteOwner: ["Propriétaire à distance à Casablanca", "Gérez votre bien à Casablanca depuis une autre ville ou l'étranger avec un interlocuteur local et un suivi clair."],
    investment: ["Investissement immobilier à Casablanca", "Analysez un projet d'investissement immobilier à Casablanca en reliant budget, quartier, type de bien, usage et économie réelle."],
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
    management: ["Property management in Casablanca", "Entrust your Casablanca property to Casa Habitat for positioning, marketing, applicant selection and follow-up."],
    letProperty: ["Rent out your property in Casablanca", "Position and market your Casablanca property with support adapted to your rental project."],
    sellProperty: ["Sell your property in Casablanca", "Prepare the sale of your apartment, villa or other property in Casablanca with a clear marketing strategy."],
    shortStayOwner: ["Short-term rental in Casablanca for owners", "Assess your property's fit for short stays in Casablanca using its characteristics and observed market demand."],
    remoteOwner: ["Remote property owner in Casablanca", "Manage your Casablanca property from another city or abroad with a local point of contact and clear follow-up."],
    investment: ["Real estate investment in Casablanca", "Frame a Casablanca property investment project around budget, neighborhood, property type, use and real economics."],
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
    management: ["إدارة العقارات في الدار البيضاء", "أوكلوا إدارة عقاركم في الدار البيضاء إلى Casa Habitat مع تموضع وتسويق واختيار الملفات والمتابعة."],
    letProperty: ["تأجير عقار في الدار البيضاء", "جهزوا عقاركم وحددوا تموضعه وسوقوه في الدار البيضاء بمواكبة مناسبة."],
    sellProperty: ["بيع عقار في الدار البيضاء", "حضّروا بيع شقتكم أو فيلتكم أو عقاركم في الدار البيضاء باستراتيجية واضحة."],
    shortStayOwner: ["الكراء قصير المدة في الدار البيضاء للمالكين", "ادرسوا ملاءمة عقاركم للكراء القصير في الدار البيضاء وفق خصائصه والطلب الملاحظ."],
    remoteOwner: ["مالك عقار عن بُعد في الدار البيضاء", "أديروا عقاركم في الدار البيضاء من مدينة أخرى أو من الخارج مع جهة اتصال محلية ومتابعة واضحة."],
    investment: ["الاستثمار العقاري في الدار البيضاء", "حددوا مشروع الاستثمار العقاري في الدار البيضاء وفق الميزانية والحي ونوع العقار والاستخدام والاقتصاد الحقيقي."],
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
    management: ["Gestión inmobiliaria en Casablanca", "Confíe la gestión de su propiedad en Casablanca a Casa Habitat para posicionamiento, comercialización, selección y seguimiento."],
    letProperty: ["Poner su propiedad en alquiler en Casablanca", "Prepare, posicione y comercialice su propiedad en Casablanca con un acompañamiento adaptado."],
    sellProperty: ["Vender su propiedad en Casablanca", "Prepare la venta de su apartamento, villa u otro inmueble en Casablanca con una estrategia clara."],
    shortStayOwner: ["Alquiler de corta duración en Casablanca para propietarios", "Estudie la adecuación de su propiedad a la corta estancia en Casablanca según sus características y demanda."],
    remoteOwner: ["Propietario a distancia en Casablanca", "Gestione su propiedad en Casablanca desde otra ciudad o el extranjero con un contacto local y seguimiento claro."],
    investment: ["Inversión inmobiliaria en Casablanca", "Defina un proyecto de inversión en Casablanca según presupuesto, barrio, tipo de inmueble, uso y economía real."],
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
    management: ["Gestione immobiliare a Casablanca", "Affida la gestione del tuo immobile a Casablanca a Casa Habitat per posizionamento, commercializzazione, selezione e follow-up."],
    letProperty: ["Mettere il tuo immobile in affitto a Casablanca", "Prepara, posiziona e commercializza il tuo immobile a Casablanca con un supporto adatto."],
    sellProperty: ["Vendere il tuo immobile a Casablanca", "Prepara la vendita del tuo appartamento, villa o altro immobile a Casablanca con una strategia chiara."],
    shortStayOwner: ["Affitti brevi a Casablanca per proprietari", "Studia l'idoneità del tuo immobile agli affitti brevi a Casablanca in base alle sue caratteristiche e alla domanda."],
    remoteOwner: ["Proprietario a distanza a Casablanca", "Gestisci il tuo immobile a Casablanca da un'altra città o dall'estero con un referente locale e un follow-up chiaro."],
    investment: ["Investimento immobiliare a Casablanca", "Definisci un progetto d'investimento a Casablanca collegando budget, quartiere, tipo di immobile, uso ed economia reale."],
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
  const ownerSeoPaths = new Set([
    "/gestion-locative",
    "/mettre-en-location",
    "/vendre-son-bien",
    "/courte-duree-proprietaire",
    "/proprietaire-a-distance",
    "/investissement",
  ]);
  const isOwnerSeoPage = ownerSeoPaths.has(pathname);
  const languageAlternates = isOwnerSeoPage
    ? locale === "fr"
      ? { fr: `/fr${pathname === "/" ? "" : pathname}` }
      : {}
    : Object.fromEntries(
        Object.keys(seo).map((lang) => [lang, `/${lang}${pathname === "/" ? "" : pathname}`])
      );

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${pathname === "/" ? "" : pathname}`,
      ...(isOwnerSeoPage && locale !== "fr"
        ? {}
        : {
            languages: {
              ...languageAlternates,
              "x-default": pathname === "/" ? `${siteConfig.url}/fr` : `${siteConfig.url}/fr${pathname}`,
            },
          }),
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
  const isNeighborhoodPath =
    pathname === "/quartiers" || pathname.startsWith("/quartiers/");
  const languages = isNeighborhoodPath
    ? locale === "fr"
      ? { fr: `/fr${pathname === "/" ? "" : pathname}` }
      : {}
    : Object.fromEntries(
        Object.keys(seo).map((lang) => [lang, `/${lang}${pathname === "/" ? "" : pathname}`])
      );
  return {
    title,
    description,
    alternates: {
      canonical: localizedPath,
      ...(locale === "fr" || !isNeighborhoodPath
        ? {
            languages: {
              ...languages,
              "x-default": `${siteConfig.url}/fr${pathname}`,
            },
          }
        : {}),
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
