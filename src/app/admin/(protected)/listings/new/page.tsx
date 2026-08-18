import { createListing } from "@/app/admin/listings-actions";
import { getNeighborhoods } from "@/lib/supabase/queries";
import ListingForm from "@/components/admin/ListingForm";

export default async function NewListingPage() {
  const neighborhoods = await getNeighborhoods();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-2">Nouveau bien</h1>
      <p className="text-ink-soft text-sm mb-8">
        Le bien est créé en brouillon — publiez-le une fois les photos ajoutées.
      </p>
      <ListingForm action={createListing} neighborhoods={neighborhoods} submitLabel="Créer le bien" />
    </div>
  );
}
