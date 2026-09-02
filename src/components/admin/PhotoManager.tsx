"use client";

import { useRef, useState, useTransition } from "react";
import { DbListingImage } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  preparePhotoUploads,
  registerPhoto,
  cleanupPhotoUpload,
  deletePhoto,
  setPrimaryPhoto,
  reorderPhotos,
  updatePhotoAlt,
} from "@/app/admin/photos-actions";

export default function PhotoManager({
  listingId,
  images,
  signedUrls,
}: {
  listingId: string;
  reference: string;
  images: DbListingImage[];
  /** URL signée par storage_path, générée côté serveur pour l'aperçu admin */
  signedUrls: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState(
    [...images].sort((a, b) => a.position - b.position)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setUploadError(null);
    startTransition(async () => {
      const preparation = await preparePhotoUploads(
        listingId,
        selectedFiles.map((file) => ({
          extension: file.name.split(".").pop() || "webp",
          mimeType: file.type,
        }))
      );

      if (preparation.error || !preparation.targets) {
        setUploadError(preparation.error ?? "Préparation de l&apos;upload impossible.");
        return;
      }

      const supabase = createClient();
      for (const [index, target] of preparation.targets.entries()) {
        const file = selectedFiles[index];
        if (!file) continue;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(target.path, file, {
            upsert: false,
            contentType: target.mimeType,
          });

        if (uploadError) {
          setUploadError(uploadError.message);
          break;
        }

        try {
          const registration = await registerPhoto(
            listingId,
            target.path,
            target.position,
            target.mimeType
          );
          if (registration.error) {
            await cleanupPhotoUpload(listingId, target.path);
            setUploadError(registration.error);
            break;
          }
        } catch (error) {
          await cleanupPhotoUpload(listingId, target.path);
          setUploadError(error instanceof Error ? error.message : "Enregistrement de la photo impossible.");
          break;
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleDelete = (imageId: string) => {
    setOrdered((prev) => prev.filter((i) => i.id !== imageId));
    startTransition(() => {
      deletePhoto(imageId, listingId);
    });
  };

  const handleSetPrimary = (imageId: string) => {
    startTransition(() => {
      setPrimaryPhoto(imageId, listingId);
    });
  };

  const handleAltChange = (imageId: string, alt: string) => {
    startTransition(() => {
      updatePhotoAlt(imageId, listingId, alt);
    });
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDrop = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...ordered];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    setOrdered(next);
    dragIndex.current = null;
    startTransition(() => {
      reorderPhotos(
        listingId,
        next.map((i) => i.id)
      );
    });
  };

  return (
    <div>
      <div className="mb-6">
        <label className="inline-block bg-navy text-ivory text-xs font-semibold uppercase tracking-widest px-6 py-3.5 rounded-sm cursor-pointer hover:bg-navy-deep transition-colors">
          {isPending ? "Envoi en cours..." : "Ajouter des photos"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isPending}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
        <p className="text-ink-soft text-xs mt-2">
          Depuis un téléphone : sélection directe dans la galerie ou l&apos;appareil photo. Glissez les vignettes pour réordonner.
        </p>
        {uploadError && <p className="text-red-600 text-xs mt-2">{uploadError}</p>}
      </div>

      {ordered.length === 0 ? (
        <div className="border border-dashed border-ink/20 rounded-sm p-10 text-center text-ink-soft text-sm">
          Aucune photo pour l&apos;instant.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {ordered.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={`border rounded-sm overflow-hidden bg-white cursor-move ${
                img.is_primary ? "border-gold ring-1 ring-gold" : "border-ink/10"
              }`}
            >
              <div className="relative aspect-square bg-navy">
                {signedUrls[img.storage_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrls[img.storage_path]}
                    alt={img.alt ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ivory/40 text-xs">
                    Aperçu indisponible
                  </div>
                )}
                {img.is_primary && (
                  <span className="absolute top-2 left-2 bg-gold text-navy text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm">
                    Principale
                  </span>
                )}
              </div>
              <div className="p-2.5 flex flex-col gap-2">
                <input
                  defaultValue={img.alt ?? ""}
                  placeholder="Texte alternatif"
                  onBlur={(e) => handleAltChange(img.id, e.target.value)}
                  className="text-xs border border-ink/15 rounded-sm px-2 py-1.5 w-full"
                />
                <div className="flex items-center justify-between">
                  {!img.is_primary && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSetPrimary(img.id)}
                      className="text-[11px] text-navy font-semibold hover:underline disabled:opacity-40"
                    >
                      Définir principale
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(img.id)}
                    className="text-[11px] text-red-600 hover:underline disabled:opacity-40 ml-auto"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
