# Casa Habitat — Plateforme immobilière

Site officiel de **Casa Habitat**, agence immobilière premium à Casablanca.
Construit avec Next.js (App Router), TypeScript, Tailwind CSS et Supabase —
indépendant de Base44.

## Stack technique

- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — base de données (Postgres), authentification, stockage des
  photos (bucket privé, URLs signées)
- Polices auto-hébergées via `next/font/local` (Fraunces, Manrope, IBM Plex
  Mono) — aucune dépendance réseau externe au moment du build
- Aucune dépendance inutile — pas de librairie ajoutée pour une fonctionnalité
  simple à faire nativement

## Installation

Prérequis : [Node.js](https://nodejs.org) 20+, npm, et un projet Supabase
(voir plus bas).

```bash
npm install
cp .env.local.example .env.local
# renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Développement local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). L'espace
administrateur est sur `/admin/login`.

## Build de production

```bash
npm run build
npm run start
```

## Structure du projet

```
src/
  app/
    (public)/            Toutes les pages publiques — a-propos, biens/[slug],
                          confier-mon-bien, contact, courte-duree, estimation,
                          favoris, locations, mentions-legales,
                          politique-confidentialite, quartiers, vente
                          + layout.tsx (header/footer/WhatsApp/favoris)
    admin/
      login/              Connexion admin (hors protection — évite toute
                           boucle de redirection)
      (protected)/        Dashboard + gestion des biens — protégés par
                           middleware + is_admin() côté serveur
      listings-actions.ts Server actions : créer/modifier/publier/archiver
      photos-actions.ts   Server actions : upload/suppression/réorganisation
    layout.tsx            Racine minimale (polices, analytics) — commune à
                           tout le site, y compris /admin
    sitemap.ts, robots.ts Générés depuis les biens publiés en base
  components/
    admin/                Formulaire de bien, tableau, gestion photos, statuts
    layout/                Header, Footer, bouton WhatsApp flottant
    sections/              Blocs de page publics (Hero, Services...)
    ui/                    Composants réutilisables (carte de bien, favoris...)
  config/
    site.ts                ⚠️ Config centrale : téléphones, e-mail, adresse, nav
  data/
    types.ts                Types TypeScript partagés (Listing, Neighborhood)
    listings.ts              Données d'origine (voir "Migration" ci-dessous)
    neighborhoods.ts          Quartiers — désormais gérés dans Supabase
  lib/
    supabase/
      client.ts, server.ts, middleware.ts   Clients Supabase (navigateur /
                                              serveur / session) — jamais de
                                              service_role côté application
      auth.ts, auth-actions.ts               Connexion/déconnexion, vérifie
                                              systématiquement is_admin()
      queries.ts                             Lectures publiques (biens publiés
                                              uniquement)
      admin-queries.ts                       Lectures admin (tous statuts)
      adapter.ts                             Convertit une ligne Supabase vers
                                              le type Listing déjà utilisé par
                                              les composants publics
      revalidate.ts                          Revalidation à la demande après
                                              chaque action admin
    images/signed-url.ts   Génère les URLs signées (bucket privé) — jamais de
                            photo de brouillon exposée publiquement
    whatsapp.ts             Liens wa.me contextualisés par page
    format.ts                Formatage prix / labels
    favorites.tsx             Contexte React pour les favoris (localStorage)
scripts/
  migrate-to-supabase.ts   Migration ponctuelle des données d'origine
```

## Architecture Supabase

- **Base de données** : Postgres, tables `neighborhoods`, `listings`,
  `listing_images`, `admins` (liste blanche des administrateurs)
- **Authentification** : Supabase Auth — un compte admin créé manuellement,
  jamais d'inscription publique
- **Sécurité** : RLS activé sur toutes les tables. Le public ne lit que les
  biens dont `publication_status = 'publie'` (biens et photos). Toute
  écriture passe par la session de l'administrateur authentifié, jamais par
  la clé `service_role` — voir `is_admin()` en base
- **Stockage** : bucket **privé** `listing-photos` — les photos sont servies
  via des URLs signées temporaires, générées uniquement pour les biens
  publiés (voir `src/lib/images/signed-url.ts`)
- **Statuts indépendants** : `publication_status` (brouillon / publié /
  archivé) et `availability_status` (disponible / réservé / loué / vendu)
  sont deux champs séparés — un bien peut être publié et réservé en même
  temps

Le schéma SQL complet (tables, RLS, storage) a été validé avant exécution ;
consultez l'historique du projet si vous devez le recréer sur un nouveau
projet Supabase.

## Espace administrateur

`/admin/login` → connexion → `/admin/dashboard`.

Depuis le dashboard : créer/modifier un bien, gérer les photos (upload
multiple, réorganisation, photo principale, suppression), publier/dépublier/
archiver, changer la disponibilité. Toute modification met à jour le site
public immédiatement (revalidation à la demande), sans nouveau déploiement.

## Migration des données d'origine

`src/data/listings.ts` et `neighborhoods.ts` contiennent les données de
départ (6 annonces d'exemple + la première annonce réelle, CH-0007). Le
site public ne lit plus ces fichiers — toutes les pages interrogent
Supabase directement (voir `src/lib/supabase/queries.ts`).

Pour migrer ces données vers Supabase une seule fois :

```bash
cp .env.migration.example .env.migration
# renseignez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# MIGRATION_ADMIN_EMAIL, MIGRATION_ADMIN_PASSWORD (vos identifiants admin)
npx tsx scripts/migrate-to-supabase.ts
```

Le script utilise vos identifiants admin (jamais la clé `service_role`) —
les écritures passent par les mêmes règles RLS que l'interface
d'administration. Les 6 annonces d'exemple sont migrées en brouillon
(invisibles publiquement), CH-0007 est migrée publiée avec ses 10 photos.
Relancer le script est sans risque (idempotent sur la référence).

## Modifier les informations de contact

Tout est centralisé dans **`src/config/site.ts`** — ne cherchez pas un numéro
de téléphone codé en dur ailleurs dans le code, il n'y en a pas.

## Ce qui est fonctionnel

- Moteur de recherche sur la page d'accueil (redirige avec filtres dans l'URL)
- Filtrage réel sur les pages de listing (type, quartier, prix, chambres, etc.)
- Favoris persistés localement (sans compte utilisateur)
- Formulaires de contact et d'estimation (validation côté client, envoi via
  e-mail pré-rempli)
- Bouton WhatsApp flottant + message pré-rempli, contextualisé par bien/page
- SEO : métadonnées par page, canonical, Open Graph, sitemap.xml, robots.txt,
  données structurées Schema.org (RealEstateAgent, Product/Offer,
  BreadcrumbList, FAQPage)
- Espace administrateur complet (voir ci-dessus)

## Prochaines étapes possibles

1. **Réservation courte durée** — calendrier de disponibilité et paiement
2. **Comptes utilisateurs** — pour synchroniser les favoris entre appareils
3. **Redirections 301** — `slug_history` est déjà prévu en base si un slug
   change après indexation Google
4. **Déploiement** — voir ci-dessous

## Variables d'environnement

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, limitée par les règles RLS |
| `NEXT_PUBLIC_GA_ID` | Facultatif — active Google Analytics si renseigné |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Facultatif — vérification Search Console |

`SUPABASE_SERVICE_ROLE_KEY` n'est jamais utilisée par l'application — voir
la section Migration ci-dessus pour son unique usage ponctuel.

## Déploiement

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <url-du-depot>
git push -u origin main
```

Connectez le dépôt à Vercel, ajoutez les variables d'environnement
ci-dessus dans les paramètres du projet, puis configurez le nom de domaine
`casahabitat.com`.

Aucun déploiement n'a été effectué automatiquement — cette étape reste entre
vos mains.
