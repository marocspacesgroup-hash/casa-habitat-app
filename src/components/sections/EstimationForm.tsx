"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

interface Errors {
  nom?: string;
  email?: string;
  telephone?: string;
  ville?: string;
}

export default function EstimationForm() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [typeBien, setTypeBien] = useState("appartement");
  const [ville, setVille] = useState("");
  const [surface, setSurface] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = "Votre nom est requis.";
    if (!email.trim()) next.email = "Votre e-mail est requis.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "E-mail invalide.";
    if (!telephone.trim()) next.telephone = "Votre téléphone est requis.";
    if (!ville.trim()) next.ville = "Précisez le quartier ou la ville du bien.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const subject = `Demande d'estimation — ${nom}`;
    const bodyLines = [
      `Nom : ${nom}`,
      `E-mail : ${email}`,
      `Téléphone : ${telephone}`,
      `Type de bien : ${typeBien}`,
      `Ville / quartier : ${ville}`,
      surface ? `Surface approximative : ${surface} m²` : null,
      "",
      details,
    ].filter(Boolean);
    const mailto = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailto;
    setSent(true);
    trackEvent("form_submit", { form: "estimation" });
  };

  const inputClass =
    "w-full bg-transparent border-b border-ink/25 focus:border-gold outline-none py-2.5 text-[15px] text-ink";
  const labelClass = "font-mono text-[10.5px] uppercase tracking-widest text-ink-soft";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="nom">Nom complet</label>
          <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} />
          {errors.nom && <p className="text-red-600 text-xs">{errors.nom}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="telephone">Téléphone</label>
          <input id="telephone" className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          {errors.telephone && <p className="text-red-600 text-xs">{errors.telephone}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">E-mail</label>
        <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="typeBien">Type de bien</label>
          <select id="typeBien" className={inputClass} value={typeBien} onChange={(e) => setTypeBien(e.target.value)}>
            <option value="appartement">Appartement</option>
            <option value="studio">Studio</option>
            <option value="villa">Villa</option>
            <option value="bureau">Bureau</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="surface">Surface approximative (m²)</label>
          <input id="surface" type="number" min="0" className={inputClass} value={surface} onChange={(e) => setSurface(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="ville">Quartier / ville du bien</label>
        <input id="ville" className={inputClass} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="ex. Maarif, Casablanca" />
        {errors.ville && <p className="text-red-600 text-xs">{errors.ville}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="details">Détails complémentaires</label>
        <textarea
          id="details"
          className={`${inputClass} min-h-[90px] resize-y`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="État du bien, année, particularités..."
        />
      </div>

      <button
        type="submit"
        className="self-start bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
      >
        Demander mon estimation
      </button>
      <p className="text-ink-soft text-xs">
        {sent
          ? "Votre application e-mail va s'ouvrir avec le message pré-rempli — il ne reste qu'à l'envoyer."
          : "Estimation gratuite et sans engagement."}
      </p>
    </form>
  );
}
