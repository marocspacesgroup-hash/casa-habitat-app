export const fr = {
  nav: { rentals:"Locations", sales:"Vente", shortStay:"Courte durée", neighborhoods:"Quartiers", about:"À propos", contact:"Contact", listProperty:"Confier mon bien" },
  hero: { title:"Trouvez votre bien à Casablanca,", highlight:"sans compromis.", subtitle:"Une sélection vérifiée, accompagnée par un interlocuteur unique.", searchPlaceholder:"Rechercher un bien", ctaButton:"Voir les biens" },
  filters: { propertyType:"Type de bien", city:"Ville", budget:"Budget", search:"Rechercher" },
  properties: { featuredTitle:"Des biens choisis, pas listés.", rooms:"pièces", bathrooms:"sdb", area:"m²", viewDetails:"Voir le bien" },
  home: {
    cabinet:"Cabinet Immobilier", looking:"Vous cherchez", lookingTitle:"Je recherche un bien", lookingText:"Location, vente ou courte durée — parcourez une sélection vérifiée à Casablanca.", lookingCta:"Voir les biens →",
    owner:"Vous possédez un bien", ownerTitle:"Je suis propriétaire", ownerText:"Confiez votre bien à Casa Habitat — estimation juste et visiteurs qualifiés.", ownerCta:"Confier mon bien →",
    premium:"Sélection premium", premiumDescription:"Un aperçu de notre portefeuille — la disponibilité évolue au fil des visites, contactez-nous pour l'état actualisé.", comingSoon:"Nouvelles annonces à venir très prochainement — contactez-nous directement en attendant.", allProperties:"Voir tous les biens →",
    services:"Ce que nous faisons", servicesTitle:"Quatre métiers,", servicesEmphasis:"une même exigence.", serviceSale:"Vente", serviceSaleText:"Estimation juste, mise en valeur soignée et négociation menée jusqu'à la signature.", serviceRent:"Location", serviceRentText:"Sélection de locataires, dossiers vérifiés, biens meublés et non meublés.", serviceShortStay:"Courte durée", serviceShortStayText:"Biens meublés prêts à accueillir, pensés pour des séjours de quelques nuits à quelques mois.", serviceManagement:"Gestion & conseil", serviceManagementText:"Suivi locatif, encaissements, entretien, et lecture du marché pour les investisseurs.",
    coverage:"Zone de couverture", neighborhoodsTitle:"Les quartiers", neighborhoodsEmphasis:"que nous connaissons.", allNeighborhoods:"Voir tous les quartiers →",
    agency:"L'agence", agencyTitle:"Un interlocuteur unique,", agencyEmphasis:"du premier échange aux clés.", agencyText:"Casa Habitat accompagne une clientèle exigeante — expatriés et résidents — avec un accompagnement bilingue, une sélection resserrée et une discrétion totale sur chaque dossier.", agencyCta:"En savoir plus sur l'agence →",
    projectTitle:"Un projet en tête ?", projectText:"Écrivez-nous directement — réponse sous 24h ouvrées, ou immédiatement sur WhatsApp.", whatsapp:"Écrire sur WhatsApp", contactForm:"Formulaire de contact"
  },
  contact: { title:"Un interlocuteur unique, du premier échange aux clés.", namePlaceholder:"Votre nom", emailPlaceholder:"Votre adresse e-mail", phonePlaceholder:"Votre téléphone", messagePlaceholder:"Votre message", submitButton:"Envoyer le message", successMessage:"Merci, votre message a bien été envoyé." },
  footer: { tagline:"Immobilier de prestige à Casablanca.", rights:"Tous droits réservés.", agency:"Agence", legal:"Légal" },
} as const;

export type Locale = {
  nav:{rentals:string;sales:string;shortStay:string;neighborhoods:string;about:string;contact:string;listProperty:string};
  hero:{title:string;highlight:string;subtitle:string;searchPlaceholder:string;ctaButton:string};
  filters:{propertyType:string;city:string;budget:string;search:string};
  properties:{featuredTitle:string;rooms:string;bathrooms:string;area:string;viewDetails:string};
  home:{cabinet:string;looking:string;lookingTitle:string;lookingText:string;lookingCta:string;owner:string;ownerTitle:string;ownerText:string;ownerCta:string;premium:string;premiumDescription:string;comingSoon:string;allProperties:string;services:string;servicesTitle:string;servicesEmphasis:string;serviceSale:string;serviceSaleText:string;serviceRent:string;serviceRentText:string;serviceShortStay:string;serviceShortStayText:string;serviceManagement:string;serviceManagementText:string;coverage:string;neighborhoodsTitle:string;neighborhoodsEmphasis:string;allNeighborhoods:string;agency:string;agencyTitle:string;agencyEmphasis:string;agencyText:string;agencyCta:string;projectTitle:string;projectText:string;whatsapp:string;contactForm:string};
  contact:{title:string;namePlaceholder:string;emailPlaceholder:string;phonePlaceholder:string;messagePlaceholder:string;submitButton:string;successMessage:string};
  footer:{tagline:string;rights:string;agency:string;legal:string};
  pages:any;
  forms:any;
};