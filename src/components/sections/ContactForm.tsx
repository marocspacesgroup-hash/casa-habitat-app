"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";

interface Errors {
  nom?: string;
  email?: string;
  telephone?: string;
  message?: string;
}

export default function ContactForm() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [bien, setBien] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = "Votre nom est requis.";
    if (!email.trim()) next.email = "Votre e-mail est requis.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "E-mail invalide.";
    if (!telephone.trim()) next.telephone = "Votre téléphone est requis.";
    if (!message.trim()) next.message = "Décrivez votre besoin en quelques mots.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const subject = `Nouvelle demande — ${nom}`;
    const bodyLines = [
      `Nom : ${nom}`,
      `E-mail : ${email}`,
      `Téléphone : ${telephone}`,
      bien ? `Bien concerné : ${bien}` : null,
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
  const labelClass =
    "font-mono text-[10.5px] uppercase tracking-widest text-ink-soft";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="nom">Nom complet</label>
        <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} />
        {errors.nom && <p className="text-red-600 text-xs">{errors.nom}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">E-mail</label>
        <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="telephone">Téléphone</label>
        <input id="telephone" className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        {errors.telephone && <p className="text-red-600 text-xs">{errors.telephone}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="bien">Bien concerné (référence, facultatif)</label>
        <input id="bien" className={inputClass} value={bien} onChange={(e) => setBien(e.target.value)} placeholder="ex. CH-0001" />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="message">Votre projet</label>
        <textarea
          id="message"
          className={`${inputClass} min-h-[100px] resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Achat, location, gestion — décrivez votre besoin en quelques lignes."
        />
        {errors.message && <p className="text-red-600 text-xs">{errors.message}</p>}
      </div>

      <button
        type="submit"
        className="self-start bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
      >
        Envoyer
      </button>
      <p className="text-ink-soft text-xs">
        {sent
          ? "Votre application e-mail va s'ouvrir avec le message pré-rempli — il ne reste qu'à l'envoyer."
          : "Réponse sous 24h ouvrées."}
      </p>
    </form>
  );
}
