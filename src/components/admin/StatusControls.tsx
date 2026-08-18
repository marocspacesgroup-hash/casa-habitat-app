"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setPublicationStatus,
  setAvailabilityStatus,
  deleteListingPermanently,
} from "@/app/admin/listings-actions";
import { PublicationStatus, AvailabilityStatus } from "@/lib/supabase/database.types";

export default function StatusControls({
  listingId,
  publicationStatus,
  availabilityStatus,
}: {
  listingId: string;
  publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePublication = (status: PublicationStatus) => {
    startTransition(async () => {
      const res = await setPublicationStatus(listingId, status);
      setMessage(res?.error ?? "Statut de publication mis à jour.");
    });
  };

  const handleAvailability = (status: AvailabilityStatus) => {
    startTransition(async () => {
      const res = await setAvailabilityStatus(listingId, status);
      setMessage(res?.error ?? "Disponibilité mise à jour.");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteListingPermanently(listingId);
      if (res?.error) {
        setMessage(res.error);
      } else {
        router.push("/admin/dashboard");
      }
    });
  };

  const pubBtn = (status: PublicationStatus, label: string) => (
    <button
      type="button"
      disabled={isPending}
      onClick={() => handlePublication(status)}
      className={`text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-sm border transition-colors disabled:opacity-40 ${
        publicationStatus === status
          ? "bg-navy text-ivory border-navy"
          : "border-ink/20 text-ink hover:border-navy"
      }`}
    >
      {label}
    </button>
  );

  const availBtn = (status: AvailabilityStatus, label: string) => (
    <button
      type="button"
      disabled={isPending}
      onClick={() => handleAvailability(status)}
      className={`text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-sm border transition-colors disabled:opacity-40 ${
        availabilityStatus === status
          ? "bg-gold text-navy border-gold"
          : "border-ink/20 text-ink hover:border-gold"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white border border-ink/10 rounded-sm p-6 mb-6">
      <h2 className="font-display text-lg text-ink mb-1">Statut</h2>
      <p className="text-ink-soft text-xs mb-5">
        Publication et disponibilité sont indépendantes — un bien peut être publié et réservé en même temps.
      </p>

      <div className="mb-5">
        <div className={"font-mono text-[10.5px] uppercase tracking-widest text-ink-soft mb-2"}>
          Publication
        </div>
        <div className="flex flex-wrap gap-2">
          {pubBtn("brouillon", "Brouillon")}
          {pubBtn("publie", "Publié")}
          {pubBtn("archive", "Archivé")}
        </div>
      </div>

      <div className="mb-6">
        <div className={"font-mono text-[10.5px] uppercase tracking-widest text-ink-soft mb-2"}>
          Disponibilité
        </div>
        <div className="flex flex-wrap gap-2">
          {availBtn("disponible", "Disponible")}
          {availBtn("reserve", "Réservé")}
          {availBtn("loue", "Loué")}
          {availBtn("vendu", "Vendu")}
        </div>
      </div>

      {message && <p className="text-ink-soft text-xs mb-5">{message}</p>}

      <div className="border-t border-ink/10 pt-5">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-red-600 hover:underline"
          >
            Supprimer définitivement ce bien
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-sm p-4">
            <p className="text-red-700 text-sm mb-3">
              Suppression définitive — supprime aussi toutes les photos du bien. Cette action est irréversible. Pour retirer le bien de la vente sans le supprimer, utilisez plutôt &quot;Archivé&quot; ci-dessus.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-sm disabled:opacity-40"
              >
                {isPending ? "Suppression..." : "Confirmer la suppression"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-ink-soft hover:underline"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
