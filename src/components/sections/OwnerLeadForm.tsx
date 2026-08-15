"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";
import { neighborhoods } from "@/data/neighborhoods";

interface Errors {
  nom?: string;
  telephone?: string;
  email?: string;
  quartier?: string;
}

export default function OwnerLeadForm() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [typeBien, setTypeBien] = useState("appartement");
  const [transaction, setTransaction] = useState("location");
  const [quartier, setQuartier] = useState("");
  const [surface, setSurface] = useState("");
  const [chambres, setChambres] = useState("");
  const [prixSouhaite, setPrixSouhaite] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = "Votre nom est requis.";
    if (!telephone.trim()) next.telephone = "Votre téléphone est requis.";
    if (!email.trim()) next.email = "Votre e-mail est requis.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "E-mail invalide.";
    if (!quartier) next.quartier = "Précisez le quartier du bien.";
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

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="whatsapp">WhatsApp (si différent)</label>
          <input id="whatsapp" className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="email">E-mail</label>
          <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="transaction">Vendre ou louer</label>
          <select id="transaction" className={inputClass} value={transaction} onChange={(e) => setTransaction(e.target.value)}>
            <option value="location">Location</option>
            <option value="vente">Vente</option>
            <option value="courte-duree">Courte durée</option>
          </select>
        </div>
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
          <label className={labelClass} htmlFor="quartier">Quartier</label>
          <select id="quartier" className={inputClass} value={quartier} onChange={(e) => setQuartier(e.target.value)}>
            <option value="">Choisir…</option>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>{n.nom}</option>
            ))}
          </select>
          {errors.quartier && <p className="text-red-600 text-xs">{errors.quartier}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="surface">Superficie (m²)</label>
          <input id="surface" type="number" min="0" className={inputClass} value={surface} onChange={(e) => setSurface(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="chambres">Chambres</label>
          <input id="chambres" type="number" min="0" className={inputClass} value={chambres} onChange={(e) => setChambres(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="prixSouhaite">Prix souhaité (DH)</label>
          <input id="prixSouhaite" type="number" min="0" className={inputClass} value={prixSouhaite} onChange={(e) => setPrixSouhaite(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="message">Informations complémentaires</label>
        <textarea
          id="message"
          className={`${inputClass} min-h-[90px] resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="État du bien, disponibilité, particularités..."
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
