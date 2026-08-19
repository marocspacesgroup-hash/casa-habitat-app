"use client";

import { useActionState } from "react";
import { DbListingWithImages } from "@/lib/supabase/database.types";
import { Neighborhood } from "@/data/types";
import { ListingFormState } from "@/app/admin/listings-actions";

const inputClass =
  "w-full border border-ink/15 rounded-sm px-3 py-2.5 text-[15px] text-ink bg-white focus:border-gold outline-none";
const labelClass = "font-mono text-[10.5px] uppercase tracking-widest text-ink-soft mb-1.5 block";
const checkboxRow = "flex items-center gap-2 text-sm text-ink";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink/10 rounded-sm p-6 mb-6">
      <h2 className="font-display text-lg text-ink mb-5">{title}</h2>
      {children}
    </div>
  );
}

export default function ListingForm({
  action,
  defaultValues,
  neighborhoods,
  submitLabel,
}: {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  defaultValues?: DbListingWithImages;
  neighborhoods: Neighborhood[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const d = defaultValues;

  return (
    <form action={formAction}>
      <Section title="Identification">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Référence</label>
            <input name="reference" defaultValue={d?.reference} required className={inputClass} placeholder="CH-0008" />
          </div>
          <div>
            <label className={labelClass}>Titre</label>
            <input name="titre" defaultValue={d?.titre} required className={inputClass} />
          </div>
        </div>
        <div className="mt-5">
          <label className={labelClass}>Slug (URL) — laisser vide pour génération automatique</label>
          <input name="slug" defaultValue={d?.slug} className={inputClass} placeholder="quartier-titre-court" />
        </div>
        <div className="mt-5">
          <label className={labelClass}>Description</label>
          <textarea name="description" defaultValue={d?.description ?? ""} rows={5} className={inputClass} />
        </div>
      </Section>

      <Section title="Transaction et type">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Transaction</label>
            <select name="transaction" defaultValue={d?.transaction ?? "location"} className={inputClass}>
              <option value="location">Location</option>
              <option value="vente">Vente</option>
              <option value="courte_duree">Courte durée</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Type de bien</label>
            <select name="type_bien" defaultValue={d?.type_bien ?? "appartement"} className={inputClass}>
              <option value="appartement">Appartement</option>
              <option value="studio">Studio</option>
              <option value="villa">Villa</option>
              <option value="bureau">Bureau</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Localisation">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Quartier</label>
            <select name="quartier_slug" defaultValue={d?.quartier_slug} required className={inputClass}>
              <option value="">Choisir…</option>
              {neighborhoods.map((n) => (
                <option key={n.slug} value={n.slug}>{n.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input name="ville" defaultValue={d?.ville ?? "Casablanca"} className={inputClass} />
          </div>
        </div>
        <div className="mt-5">
          <label className={labelClass}>Adresse / secteur (facultatif)</label>
          <input name="adresse" defaultValue={d?.adresse ?? ""} className={inputClass} />
        </div>
      </Section>

      <Section title="Prix">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Prix (DH) — laisser vide pour &quot;Sur demande&quot;</label>
            <input name="prix" type="number" min="0" defaultValue={d?.prix ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Période</label>
            <select name="periode_prix" defaultValue={d?.periode_prix ?? ""} className={inputClass}>
              <option value="">—</option>
              <option value="mois">Par mois</option>
              <option value="nuit">Par nuit</option>
            </select>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-ink/10">
          <p className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft mb-3">
            Courte durée (si applicable) — le prix par nuit ci-dessus reste la référence principale
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Prix / semaine (DH)</label>
              <input
                name="courte_duree_par_semaine"
                type="number"
                min="0"
                defaultValue={d?.courte_duree_details?.par_semaine ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prix / mois (DH)</label>
              <input
                name="courte_duree_par_mois"
                type="number"
                min="0"
                defaultValue={d?.courte_duree_details?.par_mois ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Voyageurs max.</label>
              <input
                name="courte_duree_voyageurs_max"
                type="number"
                min="1"
                defaultValue={d?.courte_duree_details?.voyageurs_max ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Caractéristiques">
        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelClass}>Surface (m²)</label>
            <input name="surface_m2" type="number" min="0" defaultValue={d?.surface_m2} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pièces</label>
            <input name="pieces" type="number" min="0" defaultValue={d?.pieces ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Chambres</label>
            <input name="chambres" type="number" min="0" defaultValue={d?.chambres ?? 0} className={inputClass} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelClass}>Salles de bain</label>
            <input name="salles_de_bain" type="number" min="0" defaultValue={d?.salles_de_bain ?? 0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>WC invités</label>
            <input name="wc_invites" type="number" min="0" defaultValue={d?.wc_invites ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Étage</label>
            <input name="etage" defaultValue={d?.etage ?? ""} placeholder="2e étage sur 5" className={inputClass} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>État</label>
            <select name="etat" defaultValue={d?.etat ?? ""} className={inputClass}>
              <option value="">—</option>
              <option value="neuf">Neuf</option>
              <option value="excellent_etat">Excellent état</option>
              <option value="bon_etat">Bon état</option>
              <option value="a_rafraichir">À rafraîchir</option>
              <option value="a_renover">À rénover</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Standing</label>
            <select name="standing" defaultValue={d?.standing ?? "standard"} className={inputClass}>
              <option value="standard">Standard</option>
              <option value="haut_standing">Haut standing</option>
              <option value="prestige">Prestige</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Équipements">
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {[
            ["ascenseur", "Ascenseur"],
            ["parking", "Parking"],
            ["meuble", "Meublé"],
            ["climatisation", "Climatisation"],
            ["chauffage", "Chauffage"],
            ["terrasse_balcon", "Terrasse / balcon"],
          ].map(([name, label]) => (
            <label key={name} className={checkboxRow}>
              <input
                type="checkbox"
                name={name}
                defaultChecked={d ? Boolean(d[name as keyof DbListingWithImages]) : false}
              />
              {label}
            </label>
          ))}
        </div>
        <div>
          <label className={labelClass}>Autres équipements (séparés par des virgules)</label>
          <input
            name="equipements"
            defaultValue={d?.equipements?.join(", ") ?? ""}
            placeholder="Cuisine américaine équipée, Serrure digitale, TV 50 pouces"
            className={inputClass}
          />
        </div>
      </Section>

      <Section title="Conditions">
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Disponibilité</label>
            <input name="disponibilite" defaultValue={d?.disponibilite ?? ""} placeholder="Immédiate" className={inputClass} />
          </div>
          <label className={`${checkboxRow} mt-6`}>
            <input type="checkbox" name="charges_incluses" defaultChecked={d?.charges_incluses ?? false} />
            Charges / syndic inclus
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Caution</label>
            <input name="caution" defaultValue={d?.caution ?? ""} placeholder="1 mois" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Honoraires d&apos;agence</label>
            <input name="honoraires_agence" defaultValue={d?.honoraires_agence ?? ""} placeholder="1 mois" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Conditions particulières</label>
          <input name="conditions_particulieres" defaultValue={d?.conditions_particulieres ?? ""} className={inputClass} />
        </div>
      </Section>

      <Section title="SEO (facultatif — généré automatiquement sinon)">
        <div className="mb-5">
          <label className={labelClass}>Titre SEO</label>
          <input name="seo_title" defaultValue={d?.seo_title ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Meta description</label>
          <textarea name="seo_description" defaultValue={d?.seo_description ?? ""} rows={2} className={inputClass} />
        </div>
      </Section>

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-sm px-4 py-3 mb-6">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-sm px-4 py-3 mb-6">
          Bien enregistré.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-navy text-ivory font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-navy-deep transition-colors disabled:opacity-50"
      >
        {pending ? "Enregistrement..." : submitLabel}
      </button>
    </form>
  );
}
