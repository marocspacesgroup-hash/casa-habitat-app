"use client";

import { useActionState, useState } from "react";
import { Neighborhood } from "@/data/types";
import { DbListingWithImages } from "@/lib/supabase/database.types";
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
  const [values, setValues] = useState(() => ({
    reference: d?.reference ?? "",
    titre: d?.titre ?? "",
    slug: d?.slug ?? "",
    description: d?.description ?? "",
    transaction: d?.transaction ?? "location",
    type_bien: d?.type_bien ?? "appartement",
    quartier_slug: d?.quartier_slug ?? "",
    ville: d?.ville ?? "Casablanca",
    adresse: d?.adresse ?? "",
    prix: d?.prix ?? "",
    periode_prix: d?.periode_prix ?? "",
    courte_duree_par_semaine: d?.courte_duree_details?.par_semaine ?? "",
    courte_duree_par_mois: d?.courte_duree_details?.par_mois ?? "",
    courte_duree_voyageurs_max: d?.courte_duree_details?.voyageurs_max ?? "",
    surface_m2: d?.surface_m2 ?? "",
    pieces: d?.pieces ?? "",
    chambres: d?.chambres ?? 0,
    salles_de_bain: d?.salles_de_bain ?? 0,
    wc_invites: d?.wc_invites ?? "",
    etage: d?.etage ?? "",
    etat: d?.etat ?? "",
    standing: d?.standing ?? "standard",
    equipements: d?.equipements?.join(", ") ?? "",
    disponibilite: d?.disponibilite ?? "",
    charges_incluses: d?.charges_incluses ?? false,
    caution: d?.caution ?? "",
    honoraires_agence: d?.honoraires_agence ?? "",
    conditions_particulieres: d?.conditions_particulieres ?? "",
    seo_title: d?.seo_title ?? "",
    seo_description: d?.seo_description ?? "",
  }));

  function updateValue(name: string, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formAction(new FormData(event.currentTarget));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <Section title="Identification">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Référence</label>
            <input name="reference" value={values.reference} onChange={(e) => updateValue("reference", e.target.value)} required className={inputClass} placeholder="CH-0008" />
          </div>
          <div>
            <label className={labelClass}>Titre</label>
            <input name="titre" value={values.titre} onChange={(e) => updateValue("titre", e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div className="mt-5">
          <label className={labelClass}>Slug (URL) — laisser vide pour génération automatique</label>
          <input name="slug" value={values.slug} onChange={(e) => updateValue("slug", e.target.value)} className={inputClass} placeholder="quartier-titre-court" />
        </div>
        <div className="mt-5">
          <label className={labelClass}>Description</label>
          <textarea name="description" value={values.description} onChange={(e) => updateValue("description", e.target.value)} rows={5} className={inputClass} />
        </div>
      </Section>

      <Section title="Transaction et type">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Transaction</label>
            <select name="transaction" value={values.transaction} onChange={(e) => updateValue("transaction", e.target.value)} className={inputClass}>
              <option value="location">Location</option>
              <option value="vente">Vente</option>
              <option value="courte_duree">Courte durée</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Type de bien</label>
            <select name="type_bien" value={values.type_bien} onChange={(e) => updateValue("type_bien", e.target.value)} className={inputClass}>
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
            <select name="quartier_slug" value={values.quartier_slug} onChange={(e) => updateValue("quartier_slug", e.target.value)} required className={inputClass}>
              <option value="">Choisir…</option>
              {neighborhoods.map((n) => (
                <option key={n.slug} value={n.slug}>{n.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input name="ville" value={values.ville} onChange={(e) => updateValue("ville", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-5">
          <label className={labelClass}>Adresse / secteur (facultatif)</label>
          <input name="adresse" value={values.adresse} onChange={(e) => updateValue("adresse", e.target.value)} className={inputClass} />
        </div>
      </Section>

      <Section title="Prix">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Prix (DH) — laisser vide pour &quot;Sur demande&quot;</label>
            <input name="prix" type="number" min="0" value={values.prix} onChange={(e) => updateValue("prix", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Période</label>
            <select name="periode_prix" value={values.periode_prix} onChange={(e) => updateValue("periode_prix", e.target.value)} className={inputClass}>
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
                value={values.courte_duree_par_semaine}
                onChange={(e) => updateValue("courte_duree_par_semaine", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prix / mois (DH)</label>
              <input
                name="courte_duree_par_mois"
                type="number"
                min="0"
                value={values.courte_duree_par_mois}
                onChange={(e) => updateValue("courte_duree_par_mois", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Voyageurs max.</label>
              <input
                name="courte_duree_voyageurs_max"
                type="number"
                min="1"
                value={values.courte_duree_voyageurs_max}
                onChange={(e) => updateValue("courte_duree_voyageurs_max", e.target.value)}
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
            <input name="surface_m2" type="number" min="0" value={values.surface_m2} onChange={(e) => updateValue("surface_m2", e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pièces</label>
            <input name="pieces" type="number" min="0" value={values.pieces} onChange={(e) => updateValue("pieces", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Chambres</label>
            <input name="chambres" type="number" min="0" value={values.chambres} onChange={(e) => updateValue("chambres", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelClass}>Salles de bain</label>
            <input name="salles_de_bain" type="number" min="0" value={values.salles_de_bain} onChange={(e) => updateValue("salles_de_bain", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>WC invités</label>
            <input name="wc_invites" type="number" min="0" value={values.wc_invites} onChange={(e) => updateValue("wc_invites", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Étage</label>
            <input name="etage" value={values.etage} onChange={(e) => updateValue("etage", e.target.value)} placeholder="2e étage sur 5" className={inputClass} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>État</label>
            <select name="etat" value={values.etat} onChange={(e) => updateValue("etat", e.target.value)} className={inputClass}>
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
            <select name="standing" value={values.standing} onChange={(e) => updateValue("standing", e.target.value)} className={inputClass}>
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
                checked={Boolean(values[name as keyof typeof values])}
                onChange={(e) => updateValue(name, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
        <div>
          <label className={labelClass}>Autres équipements (séparés par des virgules)</label>
          <input
            name="equipements"
            value={values.equipements}
            onChange={(e) => updateValue("equipements", e.target.value)}
            placeholder="Cuisine américaine équipée, Serrure digitale, TV 50 pouces"
            className={inputClass}
          />
        </div>
      </Section>

      <Section title="Conditions">
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Disponibilité</label>
            <input name="disponibilite" value={values.disponibilite} onChange={(e) => updateValue("disponibilite", e.target.value)} placeholder="Immédiate" className={inputClass} />
          </div>
          <label className={`${checkboxRow} mt-6`}>
            <input type="checkbox" name="charges_incluses" checked={values.charges_incluses} onChange={(e) => updateValue("charges_incluses", e.target.checked)} />
            Charges / syndic inclus
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          <div>
            <label className={labelClass}>Caution</label>
            <input name="caution" value={values.caution} onChange={(e) => updateValue("caution", e.target.value)} placeholder="1 mois" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Honoraires d&apos;agence</label>
            <input name="honoraires_agence" value={values.honoraires_agence} onChange={(e) => updateValue("honoraires_agence", e.target.value)} placeholder="1 mois" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Conditions particulières</label>
          <input name="conditions_particulieres" value={values.conditions_particulieres} onChange={(e) => updateValue("conditions_particulieres", e.target.value)} className={inputClass} />
        </div>
      </Section>

      <Section title="SEO (facultatif — généré automatiquement sinon)">
        <div className="mb-5">
          <label className={labelClass}>Titre SEO</label>
          <input name="seo_title" value={values.seo_title} onChange={(e) => updateValue("seo_title", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Meta description</label>
          <textarea name="seo_description" value={values.seo_description} onChange={(e) => updateValue("seo_description", e.target.value)} rows={2} className={inputClass} />
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
