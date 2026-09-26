"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "@/hooks/useTranslation";

interface Errors {
  nom?: string;
  email?: string;
  telephone?: string;
  ville?: string;
}

export default function EstimationForm() {
  const { translation } = useTranslation();
  const t = translation.forms;
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
    if (!nom.trim()) next.nom = t.requiredName;
    if (!email.trim()) next.email = t.requiredEmail;
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t.invalidEmail;
    if (!telephone.trim()) next.telephone = t.requiredPhone;
    if (!ville.trim()) next.ville = t.requiredCity;
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
          <label className={labelClass} htmlFor="nom">{t.fullName}</label>
          <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} />
          {errors.nom && <p className="text-red-600 text-xs">{errors.nom}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="telephone">{t.phone}</label>
          <input id="telephone" className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          {errors.telephone && <p className="text-red-600 text-xs">{errors.telephone}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">{t.email}</label>
        <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="typeBien">{t.propertyType}</label>
          <select id="typeBien" className={inputClass} value={typeBien} onChange={(e) => setTypeBien(e.target.value)}>
            <option value="appartement">{t.apartment}</option>
            <option value="studio">{t.studio}</option>
            <option value="villa">{t.villa}</option>
            <option value="bureau">{t.office}</option>
            <option value="autre">{t.other}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="surface">{t.surface}</label>
          <input id="surface" type="number" min="0" className={inputClass} value={surface} onChange={(e) => setSurface(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="ville">{t.neighborhoodCity}</label>
        <input id="ville" className={inputClass} value={ville} onChange={(e) => setVille(e.target.value)} placeholder={t.neighborhoodPlaceholder} />
        {errors.ville && <p className="text-red-600 text-xs">{errors.ville}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="details">{t.details}</label>
        <textarea
          id="details"
          className={`${inputClass} min-h-[90px] resize-y`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t.detailsPlaceholder}
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
