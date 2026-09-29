"use client";

import { useState, FormEvent } from "react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "@/hooks/useTranslation";

interface Errors {
  nom?: string;
  email?: string;
  telephone?: string;
  message?: string;
}

export default function ContactForm() {
  const { translation } = useTranslation();
  const t = translation.forms;
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [bien, setBien] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!nom.trim()) next.nom = t.requiredName;
    if (!email.trim()) next.email = t.requiredEmail;
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t.invalidEmail;
    if (!telephone.trim()) next.telephone = t.requiredPhone;
    if (!message.trim()) next.message = t.requiredMessage;
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
    trackEvent("form_submit", { form: "contact" });
  };

  const inputClass =
    "w-full bg-transparent border-b border-ink/25 focus:border-gold outline-none py-2.5 text-[15px] text-ink";
  const labelClass =
    "font-mono text-[10.5px] uppercase tracking-widest text-ink-soft";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="nom">{t.fullName}</label>
        <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} />
        {errors.nom && <p className="text-red-600 text-xs">{errors.nom}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">{t.email}</label>
        <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-600 text-xs">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="telephone">{t.phone}</label>
        <input id="telephone" className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        {errors.telephone && <p className="text-red-600 text-xs">{errors.telephone}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="bien">{t.property}</label>
        <input id="bien" className={inputClass} value={bien} onChange={(e) => setBien(e.target.value)} placeholder="ex. CH-0001" />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="message">{t.project}</label>
        <textarea
          id="message"
          className={`${inputClass} min-h-[100px] resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.projectPlaceholder}
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
          ? t.mailOpened
          : t.reply}
      </p>
    </form>
  );
}
