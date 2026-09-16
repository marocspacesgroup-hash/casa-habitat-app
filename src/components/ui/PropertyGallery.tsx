"use client";

import { useEffect, useRef, useState } from "react";
import PropertyImage from "./PropertyImage";
import { ListingImage } from "@/data/types";

export default function PropertyGallery({
  images,
}: {
  images: ListingImage[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const openerButtonRef = useRef<HTMLButtonElement>(null);
  const imageCount = images.length;
  // Composition déterministe :
  //   1 photo   → héroïne seule
  //   2 photos  → deux tuiles égales, pas de héroïne
  //   3 et plus → héroïne pleine largeur + bande de 2 ou 3 vignettes
  // La bande est un flex dont chaque enfant porte flex-1 : la largeur se
  // répartit exactement entre les vignettes réellement présentes, donc aucune
  // cellule ne peut rester vide, quel que soit leur nombre.
  // imageCount > 0 : garde défensive. La page de détail transmet toujours au
  // moins une image, mais le composant ne doit pas planter s'il est réutilisé
  // ailleurs avec un tableau vide.
  const hasHero = imageCount > 0 && imageCount !== 2;
  const stripImages = imageCount === 2 ? images.slice(0, 2) : images.slice(1, 4);
  const shownCount = (hasHero ? 1 : 0) + stripImages.length;
  const extraImageCount = imageCount - shownCount;

  const openGallery = (index: number, opener: HTMLButtonElement) => {
    if (imageCount === 0) return;

    setActiveIndex(index);
    openerButtonRef.current = opener;
    setIsOpen(true);
  };

  const closeGallery = () => {
    setIsOpen(false);
    openerButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        openerButtonRef.current?.focus();
        return;
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + imageCount) % imageCount);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % imageCount);
      }
      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [imageCount, isOpen]);

  // Verrouille le défilement de la page pendant l'ouverture. On mémorise les
  // valeurs précédentes plutôt que de forcer "" au nettoyage : si un autre
  // composant verrouillait déjà le scroll, son réglage est restitué intact.
  // `overflow: hidden` conserve la position de défilement, contrairement à
  // `position: fixed` — inutile de la sauvegarder puis de la restaurer.
  useEffect(() => {
    if (!isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    // Masquer la barre de défilement élargit la fenêtre : on compense sa
    // largeur pour éviter le saut horizontal du contenu fixe (Header) à
    // l'ouverture et à la fermeture sur les bureaux à barre classique.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  const renderImageTile = (
    image: ListingImage,
    index: number,
    // Largeur réellement occupée par la tuile : la héroïne fait toute la
    // largeur du contenu (plafonnée à max-w-6xl), une vignette un tiers.
    sizes: string,
    showCounter = false
  ) => (
    <button
      key={`${image.kind}-${index}`}
      type="button"
      onClick={(event) => openGallery(index, event.currentTarget)}
      aria-label={showCounter ? `Ouvrir les ${imageCount} photos` : `Agrandir la photo ${index + 1}`}
      // `block w-full` est indispensable : un <button> est inline-block par
      // défaut, il se dimensionnerait sur son contenu et laisserait apparaître
      // le fond du conteneur hors des cellules de grille (cas 1, 3 et 5+).
      // `touch-manipulation` supprime le délai de 300 ms et le zoom au double
      // tap sur les navigateurs mobiles, sans bloquer le défilement ni le pincer.
      className="group relative block h-full w-full min-h-0 min-w-0 overflow-hidden border-0 bg-navy/5 p-0 text-left touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
    >
      <PropertyImage
        image={image}
        priority={index === 0}
        sizes={sizes}
        className="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
      />
      {showCounter && extraImageCount > 0 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy/30 px-3 text-center font-mono text-xs font-medium uppercase tracking-widest text-ivory backdrop-blur-sm backdrop-brightness-90">
          +{extraImageCount} photos
        </span>
      )}
    </button>
  );

  return (
    <>
      {/*
        Aucun ratio n'est imposé au bloc : ce sont les cellules qui portent le
        leur, et la hauteur totale suit. C'est ce qui évite d'écraser les
        vignettes : auparavant, 3 rangées comprimées dans un conteneur au
        ratio 2 pour 1 produisaient des bandeaux de 3,2:1.
      */}
      <div className="mb-12 flex flex-col gap-2">
        {hasHero && (
          <div className="aspect-[4/3] overflow-hidden rounded-md md:aspect-[16/9]">
            {renderImageTile(images[0], 0, "(min-width: 1152px) 1104px, 92vw")}
          </div>
        )}

        {stripImages.length > 0 && (
          <div className="flex gap-2">
            {stripImages.map((image, position) => {
              // Index dans le tableau complet : sans héroïne les vignettes
              // partent de 0, avec héroïne elles partent de 1.
              const index = hasHero ? position + 1 : position;
              const isLast = position === stripImages.length - 1;
              return (
                <div
                  key={`${image.kind}-${index}`}
                  className="aspect-[4/3] min-w-0 flex-1 overflow-hidden rounded-md"
                >
                  {renderImageTile(
                    image,
                    index,
                    "(min-width: 1152px) 368px, 33vw",
                    isLast && extraImageCount > 0
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isOpen && (
        <div
          ref={modalRef}
          // z-[60] passe au-dessus du Header et du bouton WhatsApp flottant,
          // tous deux en z-50 : à z-index égal, l'ordre du DOM l'emportait et
          // WhatsApp, monté après <main>, recouvrait la visionneuse.
          // L'overlay couvrant tout l'écran, il intercepte aussi les clics —
          // le comportement correspond enfin à aria-modal.
          className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-navy/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galerie photos"
          // Fermeture au clic sur le fond uniquement : les contrôles et la
          // photo sont des enfants, leur clic ne remonte donc pas ici.
          onClick={(event) => {
            if (event.target === event.currentTarget) closeGallery();
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeGallery}
            aria-label="Fermer la galerie"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-ivory/10 text-2xl leading-none text-ivory hover:bg-ivory/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span aria-hidden="true">×</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIndex((index) => (index - 1 + imageCount) % imageCount)}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-ivory/10 text-3xl leading-none text-ivory hover:bg-ivory/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="h-[80vh] w-[min(90vw,1200px)]">
            <PropertyImage
              image={images[activeIndex]}
              priority
              sizes="90vw"
              fit="contain"
            />
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((index) => (index + 1) % imageCount)}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-ivory/10 text-3xl leading-none text-ivory hover:bg-ivory/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span aria-hidden="true">›</span>
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-ivory/80">
            {activeIndex + 1} / {imageCount}
          </p>
        </div>
      )}
    </>
  );
}