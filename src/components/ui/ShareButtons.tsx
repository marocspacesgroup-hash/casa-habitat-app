"use client";

import { useState } from "react";

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papier indisponible : rien à faire de plus ici
    }
  };

  const linkClass =
    "text-ivory/70 text-xs hover:text-gold transition-colors underline underline-offset-4";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <a
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${getUrl()}`)}`}
      >
        WhatsApp
      </a>
      <a
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`}
      >
        Facebook
      </a>
      <a
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(getUrl())}`}
      >
        X
      </a>
      <a
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUrl())}`}
      >
        LinkedIn
      </a>
      <button type="button" onClick={handleCopy} className={linkClass}>
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
    </div>
  );
}
