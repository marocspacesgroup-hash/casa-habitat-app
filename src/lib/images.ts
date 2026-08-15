import { ListingImage } from "@/data/types";

/**
 * Convention de nommage pour les vraies photos de biens :
 *
 *   /public/images/biens/{reference}/01.webp
 *   /public/images/biens/{reference}/02.webp
 *   /public/images/biens/{reference}/03.webp
 *   ...
 *
 * La première image (01) est utilisée comme image principale.
 * Formats : .webp de préférence (léger, largement supporté), .jpg accepté.
 */
export function listingImagePath(reference: string, index: number, ext = "webp") {
  const n = String(index).padStart(2, "0");
  return `/images/biens/${reference}/${n}.${ext}`;
}

/** Construit une image "photo" une fois le fichier réel déposé sur le disque. */
export function photoImage(
  reference: string,
  index: number,
  alt: string,
  width: number,
  height: number,
  ext = "webp"
): ListingImage {
  return {
    kind: "photo",
    src: listingImagePath(reference, index, ext),
    alt,
    width,
    height,
  };
}

/** Placeholder — aucune vraie photo disponible pour le moment. */
export function placeholderImage(): ListingImage {
  return { kind: "placeholder" };
}
