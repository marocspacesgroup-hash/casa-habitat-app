import { notFound } from "next/navigation";
import { getAdminListingById } from "@/lib/supabase/admin-queries";
import { getNeighborhoods } from "@/lib/supabase/queries";
import { getSignedPhotoUrls } from "@/lib/images/signed-url";
import { updateListing } from "@/app/admin/listings-actions";
import ListingForm from "@/components/admin/ListingForm";
import PhotoManager from "@/components/admin/PhotoManager";
import StatusControls from "@/components/admin/StatusControls";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const [listing, neighborhoods] = await Promise.all([
    getAdminListingById(id),
    getNeighborhoods(),
  ]);

  if (!listing) notFound();

  const paths = listing.listing_images.map((img) => img.storage_path);
  const signedUrlsMap = await getSignedPhotoUrls(paths);
  const signedUrls = Object.fromEntries(signedUrlsMap);

  const boundUpdate = updateListing.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl text-ink">{listing.titre}</h1>
        <span className="font-mono text-xs text-ink-soft">{listing.reference}</span>
      </div>
      {created && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-sm px-4 py-3 mb-6">
          Bien créé — ajoutez des photos et publiez-le quand il est prêt.
        </div>
      )}
      <p className="text-ink-soft text-sm mb-8">
        Toute modification (prix, description, statut) apparaît sur le site public dès l&apos;enregistrement — aucun redéploiement nécessaire.
      </p>

      <StatusControls
        listingId={listing.id}
        publicationStatus={listing.publication_status}
        availabilityStatus={listing.availability_status}
      />

      <div className="bg-white border border-ink/10 rounded-sm p-6 mb-6">
        <h2 className="font-display text-lg text-ink mb-5">Photos</h2>
        <PhotoManager
          listingId={listing.id}
          reference={listing.reference}
          images={listing.listing_images}
          signedUrls={signedUrls}
        />
      </div>

      <ListingForm
        action={boundUpdate}
        defaultValues={listing}
        neighborhoods={neighborhoods}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}
