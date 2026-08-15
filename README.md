# Casa Habitat — Plateforme immobilière

Site officiel de **Casa Habitat**, agence immobilière premium à Casablanca.
Construit avec Next.js (App Router), TypeScript et Tailwind CSS — indépendant
de Base44.

## Stack technique

- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS v4**
- Polices auto-hébergées via `next/font` (Fraunces, Manrope, IBM Plex Mono)
- Aucune dépendance inutile — pas de librairie ajoutée pour une fonctionnalité
  simple à faire nativement

## Installation

Prérequis : [Node.js](https://nodejs.org) 20+ et npm.

```bash
npm install
```

## Développement local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Build de production

```bash
npm run build
npm run start
```

## Structure du projet

```
src/
  app/                  Routes (App Router) — une page par dossier
    biens/[slug]/       Page détaillée d'un bien
    quartiers/[slug]/   Page détaillée d'un quartier
    locations/          Locations (+ meublées/vides)
    vente/               Biens à vendre
    courte-duree/        Location courte durée
    contact/, estimation/, a-propos/, favoris/
    mentions-legales/, politique-confidentialite/
    sitemap.ts, robots.ts
  components/
    layout/              Header, Footer, bouton WhatsApp flottant
    sections/            Blocs de page (Hero, Services, formulaires...)
    ui/                  Composants réutilisables (carte de bien, favoris...)
  config/
    site.ts              ⚠️ Config centrale : téléphones, e-mail, adresse, nav
  data/
    types.ts              Types TypeScript (Listing, Neighborhood)
    listings.ts            Données de démonstration (isDemo: true)
    neighborhoods.ts        Quartiers couverts
  lib/
    whatsapp.ts            Génère les liens wa.me avec message pré-rempli
    format.ts               Formatage prix / labels
    favorites.tsx            Contexte React pour les favoris (localStorage)
```

## Modifier les informations de contact

Tout est centralisé dans **`src/config/site.ts`** — ne cherchez pas un numéro
de téléphone codé en dur ailleurs dans le code, il n'y en a pas.

## Remplacer les données de démonstration

Les biens et quartiers actuels dans `src/data/listings.ts` et
`src/data/neighborhoods.ts` sont des **données de démonstration** (`isDemo:
true`), utilisées pour tester l'interface. Remplacez-les par les vraies
annonces de l'agence en respectant le même format (voir `src/data/types.ts`).

Chaque bien a une référence unique au format `CH-0001`, `CH-0002`, etc.

## Ce qui est fonctionnel dès maintenant

- Moteur de recherche sur la page d'accueil (redirige avec filtres dans l'URL)
- Filtrage réel sur les pages de listing (type, quartier, prix, chambres, etc.)
- Favoris persistés localement (sans compte utilisateur)
- Formulaires de contact et d'estimation (validation côté client, envoi via
  e-mail pré-rempli — aucun backend requis pour cette première version)
- Bouton WhatsApp flottant + message pré-rempli selon le bien consulté
- SEO : métadonnées par page, Open Graph, sitemap.xml, robots.txt, données
  structurées Schema.org (RealEstateAgent, Product/Offer, BreadcrumbList,
  FAQPage)

## Prochaines étapes recommandées

1. **Remplacer les données de démo** par les vraies annonces
2. **Ajouter de vraies photos** (actuellement des cadres dégradés en attente)
3. **Administration** — aujourd'hui les biens sont dans un fichier TypeScript ;
   pour une gestion sans toucher au code, prévoir soit un CMS headless (Sanity,
   Payload...), soit une base de données (Postgres + Prisma) avec un panel
   d'administration
4. **Réservation courte durée** — calendrier de disponibilité et paiement
5. **Comptes utilisateurs** — pour synchroniser les favoris entre appareils
6. **Déploiement** — voir ci-dessous

## Déploiement

Ce projet est prêt pour un déploiement sur toute plateforme supportant
Next.js :

- **Vercel** (le plus simple pour Next.js) : connectez le dépôt GitHub, aucune
  configuration nécessaire
- **Netlify**, **Railway**, ou un serveur Node.js classique fonctionnent aussi

Étapes générales :

```bash
git init
git add .
git commit -m "Initial commit"
# créez un dépôt sur GitHub, puis :
git remote add origin <url-du-depot>
git push -u origin main
```

Ensuite, connectez le dépôt à Vercel (ou la plateforme choisie) et configurez
le nom de domaine `casahabitat.com` dans les paramètres du projet.

Aucun déploiement n'a été effectué automatiquement — cette étape reste entre
vos mains, comme demandé.
