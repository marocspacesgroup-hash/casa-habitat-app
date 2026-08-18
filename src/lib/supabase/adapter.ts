import { Listing, ListingImage, PropertyCondition } from "@/data/types";
import { DbListingWithImages, DbPropertyCondition } from "./database.types";
import { getSignedPhotoUrls } from "@/lib/images/signed-url";

const conditionMap: Record<DbPropertyCondition, PropertyCondition> = {
  neuf: "neuf",
  excellent_etat: "excellent-etat",
  bon_etat: "bon-etat",
  a_rafraichir: "a-rafraichir",
  a_renover: "a-renover",
};

/**
 * Convertit les lignes Supabase (snake_case, statuts séparés) vers le
 * type Listing déjà utilisé par ListingCard, la fiche bien, etc. Ce choix
 * évite de réécrire les composants publics déjà construits et testés.
 *
 * Le site public ne travaille qu'avec des biens publiés (filtré en amont
 * par les requêtes) : le champ `statut` ci-dessous reflète uniquement la
 * disponibilité (availability_status) — la publication est implicite.
 * L'admin, lui, travaille directement avec le type DbListing complet,
 * qui distingue les deux statuts.
 */
export async function adaptListingForPublicSite(
  db: DbListingWithImages
): Promise<Listing> {
  const sortedImages = [...db.listing_images].sort((a, b) => a.position - b.position);
  const paths = sortedImages.map((img) => img.storage_path);
  const signedUrls = await getSignedPhotoUrls(paths);

  const toImage = (path: string, alt: string | null): ListingImage => {
    const url = signedUrls.get(path);
    if (!url) return { kind: "placeholder" };
    return { kind: "photo", src: url, alt: alt ?? db.titre, width: 1500, height: 2000 };
  };

  const images = sortedImages.map((img) => toImage(img.storage_path, img.alt));
  const primary = sortedImages.find((img) => img.is_primary) ?? sortedImages[0];
  const imagePrincipale = primary
    ? toImage(primary.storage_path, primary.alt)
    : ({ kind: "placeholder" } as ListingImage);

  return {
    id: db.id,
    reference: db.reference,
    slug: db.slug,
    isSample: db.is_sample,

    titre: db.titre,
    transaction: db.transaction === "courte_duree" ? "courte-duree" : db.transaction,
    typeBien: db.type_bien,
    statut: db.availability_status,

    quartierSlug: db.quartier_slug,
    quartierNom: db.neighborhoods?.nom,
    ville: db.ville,
    adresse: db.adresse ?? undefined,

    prix: db.prix,
    devise: "DH",
    periodePrix: db.periode_prix ?? undefined,

    surfaceM2: db.surface_m2,
    pieces: db.pieces ?? undefined,
    chambres: db.chambres,
    sallesDeBain: db.salles_de_bain,
    wcInvites: db.wc_invites ?? undefined,
    etage: db.etage ?? undefined,

    ascenseur: db.ascenseur,
    parking: db.parking,
    meuble: db.meuble,
    climatisation: db.climatisation,
    terrasseBalcon: db.terrasse_balcon ?? undefined,
    etat: db.etat ? conditionMap[db.etat] : undefined,

    standing: db.standing === "haut_standing" ? "haut-standing" : db.standing,

    equipements: db.equipements,
    description: db.description ?? "",

    disponibilite: db.disponibilite ?? undefined,
    dateMiseAJour: db.updated_at,

    chargesIncluses: db.charges_incluses ?? undefined,
    caution: db.caution ?? undefined,
    honorairesAgence: db.honoraires_agence ?? undefined,
    conditionsParticulieres: db.conditions_particulieres ?? undefined,

    courteDuree: db.courte_duree_details
      ? {
          parNuit: db.prix ?? 0,
          parSemaine: db.courte_duree_details.par_semaine,
          parMois: db.courte_duree_details.par_mois,
          voyageursMax: db.courte_duree_details.voyageurs_max ?? 1,
        }
      : undefined,

    imagePrincipale,
    images,
  };
}

export async function adaptListingsForPublicSite(
  rows: DbListingWithImages[]
): Promise<Listing[]> {
  return Promise.all(rows.map(adaptListingForPublicSite));
}
