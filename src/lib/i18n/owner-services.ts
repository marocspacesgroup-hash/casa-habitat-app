export type OwnerServiceSection = { title: string; body: string };
export type OwnerServiceLink = { label: string; href: string };
export type OwnerServiceContent = {
  slug: string; eyebrow: string; title: string; emphasis: string; intro: string;
  sections: OwnerServiceSection[]; nextTitle: string; links: OwnerServiceLink[];
  ctaTitle: string; ctaText: string; ctaPrimary: string; ctaWhatsapp: string;
};

const common = {
  ctaPrimary: "Demander une estimation",
  ctaWhatsapp: "Écrire sur WhatsApp",
};

export const ownerServiceContent: Record<string, OwnerServiceContent> = {
  "gestion-locative": {
    slug: "gestion-locative", eyebrow: "Propriétaires",
    title: "Gestion locative à Casablanca :", emphasis: "confiez votre bien à Casa Habitat",
    intro: "Déléguer la gestion d'un appartement, d'un studio ou d'un autre bien ne consiste pas seulement à trouver un locataire. Casa Habitat vous accompagne dans le positionnement, la commercialisation, la sélection du dossier et le suivi du bien, selon le niveau d'accompagnement dont vous avez besoin.",
    sections: [
      { title: "Pourquoi déléguer la gestion ?", body: "La gestion locative demande de la disponibilité, une bonne connaissance du quartier et une capacité à traiter les demandes avec régularité. L'objectif est de vous faire gagner du temps tout en gardant une vision claire de votre bien, de son positionnement et de sa commercialisation." },
      { title: "De la mise en location au suivi", body: "Nous pouvons intervenir sur la présentation du bien, la recherche de candidats, l'organisation des visites, la qualification des profils et la coordination des échanges jusqu'à la mise en place de la location. Lorsque le besoin porte sur le suivi, la mission peut être adaptée au bien et à votre situation." },
      { title: "Une lecture locale du marché", body: "Casablanca n'est pas un marché uniforme. Maarif, Gauthier, Racine, Bourgogne, Anfa, CFC ou d'autres secteurs répondent à des profils de locataires et à des usages différents. Le positionnement d'un bien doit donc partir de son emplacement, de ses caractéristiques et de la demande réellement observée." },
      { title: "Un accompagnement transparent", body: "Nous privilégions des informations vérifiables et des échanges clairs. Une estimation, un niveau de loyer ou une stratégie de commercialisation doivent être expliqués à partir des caractéristiques du bien et du contexte de marché, sans promesse de rendement automatique." }
    ],
    nextTitle: "Approfondir votre projet",
    links: [{label:"Confier mon bien",href:"/confier-mon-bien"},{label:"Estimation",href:"/estimation"},{label:"Quartiers",href:"/quartiers"},{label:"Mettre en location",href:"/mettre-en-location"}],
    ctaTitle: "Parlons de votre bien", ctaText: "Décrivez votre bien et votre objectif. Nous pourrons déterminer le niveau d'accompagnement adapté.", ...common
  },
  "mettre-en-location": {
    slug: "mettre-en-location", eyebrow: "Mise en location",
    title: "Mettre son bien en location à", emphasis: "Casablanca",
    intro: "Vous souhaitez louer un appartement, un studio ou une villa ? La mise en location commence par un bon positionnement du bien, puis par une présentation claire et une sélection sérieuse des candidats.",
    sections: [
      { title: "Commencer par le bon positionnement", body: "Le loyer demandé doit être cohérent avec le quartier, la surface, l'état, l'équipement, l'étage, la résidence et les prestations du bien. Un prix trop élevé peut ralentir la commercialisation ; un prix mal défini peut également réduire la qualité des demandes reçues." },
      { title: "Présenter le bien pour attirer les bons profils", body: "Photos, description, caractéristiques et disponibilité doivent donner une information utile avant la visite. Pour Casa Habitat, la commercialisation doit aider un candidat à comprendre rapidement si le bien correspond réellement à sa recherche." },
      { title: "Qualifier avant d'organiser les visites", body: "Budget, situation professionnelle, nombre d'occupants, durée envisagée et besoins spécifiques permettent de mieux préparer les visites. Cette étape ne remplace pas les vérifications nécessaires, mais elle évite une partie des visites sans adéquation." },
      { title: "De la candidature à la location", body: "Après les visites, les échanges portent sur le dossier, les conditions et les prochaines étapes. Le propriétaire conserve une vision claire du processus, tandis que le candidat dispose d'informations précises sur le bien et la location envisagée." }
    ],
    nextTitle: "Construire votre stratégie",
    links: [{label:"Gestion locative",href:"/gestion-locative"},{label:"Estimation",href:"/estimation"},{label:"Quartiers",href:"/quartiers"},{label:"Confier mon bien",href:"/confier-mon-bien"}],
    ctaTitle: "Votre bien est-il prêt ?", ctaText: "Parlez-nous de sa localisation, de sa surface et de votre objectif de loyer. Nous vous orienterons sur la prochaine étape.", ...common
  },
  "vendre-son-bien": {
    slug: "vendre-son-bien", eyebrow: "Vente propriétaire",
    title: "Vendre son bien immobilier à", emphasis: "Casablanca",
    intro: "Vendre un appartement, une villa ou un autre actif immobilier demande plus qu'une annonce. Le prix de présentation, la qualité du dossier, la mise en valeur et la qualification des acquéreurs influencent directement le déroulement de la commercialisation.",
    sections: [
      { title: "Définir un prix défendable", body: "Une estimation utile doit tenir compte de la localisation, des caractéristiques du bien, de son état et des références disponibles. Le prix n'est pas seulement un chiffre : il doit correspondre au positionnement commercial recherché et au type d'acquéreur visé." },
      { title: "Préparer le bien et son dossier", body: "Une présentation soignée permet de faire ressortir les caractéristiques qui comptent réellement. Les informations techniques, la situation du bien et les éléments nécessaires à la transaction doivent être suffisamment clairs pour avancer avec des prospects sérieux." },
      { title: "Commercialiser sans diluer le bien", body: "Une stratégie de diffusion doit privilégier la qualité de la présentation et la pertinence des contacts. Le but n'est pas de multiplier artificiellement les annonces, mais de faciliter la rencontre entre le bien et les acquéreurs dont le projet correspond." },
      { title: "Visites, échanges et négociation", body: "La qualification des prospects permet de préparer les visites et de mieux comprendre le projet d'achat. Les discussions sur le prix et les conditions restent liées au dossier réel, aux caractéristiques du bien et aux intérêts du propriétaire." }
    ],
    nextTitle: "Étapes complémentaires",
    links: [{label:"Estimation",href:"/estimation"},{label:"Vente",href:"/vente"},{label:"Quartiers",href:"/quartiers"},{label:"Confier mon bien",href:"/confier-mon-bien"}],
    ctaTitle: "Vous envisagez de vendre ?", ctaText: "Commencez par nous transmettre les informations essentielles du bien. Nous pourrons discuter de son positionnement.", ...common
  },
  "courte-duree-proprietaire": {
    slug: "courte-duree-proprietaire", eyebrow: "Courte durée propriétaire",
    title: "Location courte durée à Casablanca :", emphasis: "valoriser son bien",
    intro: "La courte durée peut répondre à certains biens et à certains emplacements, mais elle ne doit pas être présentée comme un rendement garanti. Une étude sérieuse commence par l'adéquation du bien, sa localisation, ses équipements et le niveau de demande réellement observable.",
    sections: [
      { title: "Vérifier si le bien s'y prête", body: "Surface, ameublement, confort, accès, résidence, stationnement et emplacement jouent sur l'intérêt d'un bien pour des séjours courts. Le même appartement peut être pertinent pour une clientèle de passage et moins adapté à un autre usage selon son quartier et ses caractéristiques." },
      { title: "Préparer l'expérience", body: "La qualité des photos, la description, l'équipement, l'organisation de l'arrivée et la propreté font partie du produit. Une stratégie courte durée doit prévoir le parcours du voyageur avant, pendant et après le séjour." },
      { title: "Organiser l'exploitation", body: "Demandes, réservations, arrivées, départs, ménage et suivi nécessitent une organisation régulière. Le niveau de délégation peut être défini selon la disponibilité du propriétaire et les contraintes du bien." },
      { title: "Étudier l'économie réelle", body: "Avant toute décision, il faut distinguer chiffre d'affaires potentiel, charges, ménage, périodes de vacance, maintenance, fiscalité et frais de gestion. Casa Habitat ne présente pas un rendement fixe sans données et hypothèses clairement établies." }
    ],
    nextTitle: "Explorer les autres options",
    links: [{label:"Courte durée",href:"/courte-duree"},{label:"Gestion locative",href:"/gestion-locative"},{label:"Estimation",href:"/estimation"},{label:"Confier mon bien",href:"/confier-mon-bien"}],
    ctaTitle: "Étudier votre bien", ctaText: "Donnez-nous la localisation et les principales caractéristiques. Nous pourrons examiner le scénario adapté.", ...common
  },
  "proprietaire-a-distance": {
    slug: "proprietaire-a-distance", eyebrow: "Propriétaires à distance",
    title: "Propriétaire à distance à Casablanca :", emphasis: "gérez votre bien sans être sur place",
    intro: "Être propriétaire à Casablanca depuis une autre ville ou depuis l'étranger ajoute une contrainte simple : il faut pouvoir compter sur un interlocuteur local et disposer d'informations suffisamment claires pour décider à distance.",
    sections: [
      { title: "Un relais local", body: "Pour un propriétaire absent, les questions pratiques ne disparaissent pas : visites, demandes de locataires, état du bien, entretien, commercialisation ou projet de vente. L'objectif d'un accompagnement local est de réduire les déplacements imposés et de garder une coordination identifiable." },
      { title: "Location, vente ou courte durée", body: "Le besoin peut évoluer dans le temps. Un propriétaire peut vouloir louer aujourd'hui, vendre plus tard ou étudier la courte durée. La stratégie doit donc partir de l'objectif actuel et des caractéristiques du bien plutôt que d'un service standard imposé." },
      { title: "Des informations pour décider", body: "Photos, état du bien, demandes reçues, positionnement et échanges avec les candidats permettent de suivre le dossier. Pour les décisions importantes, les hypothèses et conditions doivent être explicitées avant de s'engager." },
      { title: "Une relation à construire dans la durée", body: "La confiance se construit par la régularité des échanges et la traçabilité des étapes. Casa Habitat privilégie un interlocuteur identifié et une communication directe avec le propriétaire." }
    ],
    nextTitle: "Services utiles à distance",
    links: [{label:"Gestion locative",href:"/gestion-locative"},{label:"Mettre en location",href:"/mettre-en-location"},{label:"Vendre son bien",href:"/vendre-son-bien"},{label:"Confier mon bien",href:"/confier-mon-bien"}],
    ctaTitle: "Vous êtes loin de Casablanca ?", ctaText: "Décrivez votre bien et votre situation. Nous pouvons commencer par clarifier votre objectif.", ...common
  },
  "investissement": {
    slug: "investissement", eyebrow: "Investissement immobilier",
    title: "Investissement immobilier à", emphasis: "Casablanca",
    intro: "Investir dans l'immobilier à Casablanca demande de relier le budget, l'emplacement, le type de bien, l'usage recherché et l'économie réelle de l'opération. Une décision d'investissement doit reposer sur des hypothèses explicites et non sur une promesse de rendement.",
    sections: [
      { title: "Partir de l'objectif", body: "Acheter pour louer, conserver un patrimoine, rechercher un usage mixte ou étudier la courte durée ne conduit pas aux mêmes choix. Le budget disponible, l'horizon de détention et le niveau de gestion accepté doivent être clarifiés avant de sélectionner un bien." },
      { title: "Choisir le quartier et le type de bien", body: "À Casablanca, l'emplacement influence fortement les usages et les profils de demande. Maarif, Gauthier, Racine, Bourgogne, Anfa, CFC et d'autres secteurs présentent des caractéristiques différentes. Le choix doit partir du projet, puis être confronté aux biens réellement disponibles." },
      { title: "Calculer l'économie de l'opération", body: "Une étude complète doit intégrer prix d'acquisition, frais, travaux éventuels, charges, financement, loyer envisagé, vacance, gestion et entretien. Le rendement indicatif ne prend son sens qu'avec une méthodologie, une date et des hypothèses clairement indiquées." },
      { title: "Comparer avant de décider", body: "Plusieurs scénarios peuvent être étudiés : location longue durée, location meublée ou courte durée lorsque le bien s'y prête. Casa Habitat peut aider à relier les caractéristiques d'un bien aux usages locatifs possibles, sans remplacer les vérifications juridiques, fiscales ou financières nécessaires." }
    ],
    nextTitle: "Poursuivre l'analyse",
    links: [{label:"Biens à vendre",href:"/vente"},{label:"Quartiers",href:"/quartiers"},{label:"Gestion locative",href:"/gestion-locative"},{label:"Courte durée",href:"/courte-duree"}],
    ctaTitle: "Vous avez un projet d'investissement ?", ctaText: "Partagez votre budget, votre objectif et votre horizon. Nous pourrons cadrer les critères de recherche.", ...common
  }
};
