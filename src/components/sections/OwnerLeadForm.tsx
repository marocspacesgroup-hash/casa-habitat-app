"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";
import { Neighborhood } from "@/data/types";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "@/hooks/useTranslation";

interface Errors {
  nom?: string;
  telephone?: string;
  email?: string;
  quartier?: string;
}

export default function OwnerLeadForm({ neighborhoods }: { neighborhoods: Neighborhood[] }) {
  const { translation } = useTranslation();
  const t = translation.forms;
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [typeBien, setTypeBien] = useState("appartement");
  const [transaction, setTransaction] = useState("location");
  const [besoin, setBesoin] = useState("estimation");
  const [quartier, setQuartier] = useState("");
  const [surface, setSurface] = useState("");
  const [chambres, setChambres] = useState("");
  const [prixSouhaite, setPrixSouhaite] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = t.requiredName;
    if (!telephone.trim()) next.telephone = t.requiredPhone;
    if (!email.trim()) next.email = t.requiredEmail;
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t.invalidEmail;
    if (!quartier) next.quartier = t.requiredNeighborhood;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const neighborhoodName =
      neighborhoods.find((n) => n.slug === quartier)?.nom ?? quartier;

    const subject = `Nouveau bien à confier — ${nom}`;
    const bodyLines = [
      `Nom : ${nom}`,
      `Téléphone : ${telephone}`,
      whatsapp ? `WhatsApp : ${whatsapp}` : null,
      `E-mail : ${email}`,
      `Type de bien : ${typeBien}`,
      `Transaction souhaitée : ${transaction}`,
      `Besoin : ${besoin}`,
      `Quartier : ${neighborhoodName}`,
      surface ? `Superficie : ${surface} m²` : null,
      chambres ? `Chambres : ${chambres}` : null,
      prixSouhaite ? `Prix souhaité : ${prixSouhaite} DH` : null,
      "",
      message,
    ].filter(Boolean);

    const mailto = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailto;
    setSent(true);
    trackEvent("form_submit", { form: "confier_mon_bien" });
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

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="whatsapp">{t.whatsapp}</label>
          <input id="whatsapp" className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="email">{t.email}</label>
          <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="transaction">{t.sellRent}</label>
          <select id="transaction" className={inputClass} value={transaction} onChange={(e) => setTransaction(e.target.value)}>
            <option value="location">{t.transactionRent}</option>
            <option value="vente">{t.transactionSale}</option>
            <option value="courte-duree">{t.transactionShort}</option>
          </select>
        </div>
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
          <label className={labelClass} htmlFor="besoin">{t.need}</label>
          <select id="besoin" className={inputClass} value={besoin} onChange={(e) => setBesoin(e.target.value)}>
            <option value="estimation">{t.needEstimate}</option>
            <option value="commercialisation">{t.needMarketing}</option>
            <option value="accompagnement">{t.needSupport}</option>
            <option value="gestion-locative">{t.needManagement}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="quartier">{t.neighborhood}</label>
          <select id="quartier" className={inputClass} value={quartier} onChange={(e) => setQuartier(e.target.value)}>
            <option value="">{t.choose}</option>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>{n.nom}</option>
            ))}
          </select>
          {errors.quartier && <p className="text-red-600 text-xs">{errors.quartier}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="surface">{t.area}</label>
          <input id="surface" type="number" min="0" className={inputClass} value={surface} onChange={(e) => setSurface(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="chambres">{t.rooms}</label>
          <input id="chambres" type="number" min="0" className={inputClass} value={chambres} onChange={(e) => setChambres(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="prixSouhaite">{t.desiredPrice}</label>
          <input id="prixSouhaite" type="number" min="0" className={inputClass} value={prixSouhaite} onChange={(e) => setPrixSouhaite(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="message">{t.additional}</label>
        <textarea
          id="message"
          className={`${inputClass} min-h-[90px] resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.additionalPlaceholder}
        />
      </div>

      <button
        type="submit"
        className="self-start bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
      >
        Confier mon bien
      </button>
      <p className="text-ink-soft text-xs">
        {sent
          ? "Votre application e-mail va s'ouvrir avec le message pré-rempli — il ne reste qu'à l'envoyer."
          : "Casa Habitat vous recontacte rapidement pour en discuter."}
      </p>
    </form>
  );
}
