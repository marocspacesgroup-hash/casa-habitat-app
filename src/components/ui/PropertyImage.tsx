import Image from "next/image";
import { ListingImage } from "@/data/types";

/**
 * Affiche une image de bien. Tant que `image.kind === "placeholder"`,
 * affiche un cadre dégradé de marque — jamais de <img> cassé.
 * Dès qu'un vrai fichier existe dans /public/images/biens/{reference}/,
 * les données passent à kind: "photo" et next/image prend le relais
 * (optimisation, lazy loading, dimensions responsives automatiques).
 */
export default function PropertyImage({
  image,
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
}: {
  image: ListingImage;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (image.kind === "photo") {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`w-full h-full bg-gradient-to-br from-[#1e3a58] to-navy ${className}`}
      aria-hidden="true"
    />
  );
}
