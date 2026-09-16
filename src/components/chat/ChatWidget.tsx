"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

/**
 * Conseiller virtuel Casa Habitat.
 *
 * Positionnement : le bouton se place AU-DESSUS du bouton WhatsApp flottant
 * (bottom-24 contre bottom-6), jamais à côté. WhatsAppFloat n'est pas modifié,
 * et les deux ne se recouvrent à aucune largeur. Le panneau monte en z-[60],
 * au-dessus du Header et de WhatsApp qui sont tous deux en z-50.
 */

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Je cherche un appartement à louer",
  "Un studio meublé à Maarif",
  "Quels biens à la vente ?",
];

/**
 * Rendu des réponses du modèle.
 *
 * Le texte vient d'une source non fiable : il n'est jamais interprété comme du
 * HTML, et aucune adresse de lien n'est reprise telle quelle. Seules deux
 * formes sont reconnues, décrites par les expressions ci-dessous — une fiche
 * publique et un lien WhatsApp. Tout le reste demeure du texte affiché tel quel,
 * donc échappé par React. `javascript:`, `data:`, `vbscript:`, une balise ou un
 * gestionnaire d'événement ne peuvent pas devenir un lien : ils ne
 * correspondent à aucun des deux motifs.
 *
 * L'ordre des alternatives compte : la forme Markdown `[libellé](/biens/x)`
 * doit être reconnue avant le chemin nu qu'elle contient, faute de quoi les
 * crochets resteraient visibles.
 */
const TOKEN_PATTERN =
  /\[([^\]\n]{1,80})\]\((\/biens\/[a-z0-9-]+)\)|(https:\/\/wa\.me\/[^\s<>"'`)\]]+)|(\/biens\/[a-z0-9-]+)/gi;

/** Le modèle a pour consigne de ne pas produire de Markdown ; ceci rattrape le gras résiduel. */
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g;

const INTERNAL_LINK =
  "inline-block underline underline-offset-2 py-0.5 hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const WHATSAPP_LINK =
  "my-1 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-sm border border-navy/20 bg-navy px-4 text-[15px] text-ivory no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Texte simple : on retire les marqueurs de gras, on ne produit aucun autre balisage. */
function renderPlain(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(BOLD_PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    nodes.push(<strong key={`${keyPrefix}-${at}`}>{match[1]}</strong>);
    last = at + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(...renderPlain(text.slice(last, at), `p${key}`));
    last = at + match[0].length;

    const [, label, labelledPath, whatsappRaw, barePath] = match;
    const path = labelledPath ?? barePath;

    if (path) {
      const shown = (label ?? "").replace(BOLD_PATTERN, "$1").trim();
      nodes.push(
        <Link key={key++} href={path} className={INTERNAL_LINK}>
          {shown || "Voir la fiche"}
        </Link>
      );
      continue;
    }

    // Une phrase se terminant par le lien ferait entrer sa ponctuation dans
    // l'adresse : on la rend au texte plutôt que de la laisser dans le href.
    const url = whatsappRaw.replace(/[.,;:!?]+$/, "");
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={WHATSAPP_LINK}
      >
        Contacter Casa Habitat sur WhatsApp
      </a>
    );
    if (url.length < whatsappRaw.length) nodes.push(whatsappRaw.slice(url.length));
  }

  if (last < text.length) nodes.push(...renderPlain(text.slice(last), "tail"));
  return nodes;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    openerRef.current?.focus();
  }, []);

  // Clavier : Échap ferme, Tab reste piégé dans le panneau.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        openerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Verrouillage du défilement en plein écran mobile uniquement : au-delà de
  // 768 px le panneau est encarté et la page derrière peut rester utilisable.
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, status]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setInput("");
      setBusy(true);
      setStatus("Réflexion…");
      const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
      setMessages(nextMessages);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: messages }),
        });

        if (!response.body) throw new Error("no-body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            let event: { type?: string; label?: string; text?: string; message?: string };
            try {
              event = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }
            if (event.type === "status" && event.label) setStatus(event.label);
            if (event.type === "message" && event.text) {
              setStatus(null);
              setMessages((current) => [...current, { role: "assistant", text: event.text! }]);
            }
            if (event.type === "error" && event.message) {
              setStatus(null);
              setMessages((current) => [
                ...current,
                { role: "assistant", text: event.message! },
              ]);
            }
          }
        }
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text: "La connexion a été interrompue. Réessayez, ou joignez-nous par WhatsApp.",
          },
        ]);
      } finally {
        setStatus(null);
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, messages]
  );

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le conseiller virtuel Casa Habitat"
        aria-expanded={isOpen}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full border border-gold/40 bg-navy text-gold shadow-lg shadow-black/20 transition-colors hover:border-gold hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Conseiller virtuel Casa Habitat"
          className="fixed inset-0 z-[60] flex flex-col bg-ivory md:inset-auto md:bottom-6 md:right-6 md:h-[min(620px,calc(100vh-3rem))] md:w-[min(420px,calc(100vw-3rem))] md:rounded-md md:border md:border-ink/10 md:shadow-2xl md:shadow-black/25"
        >
          <header className="flex items-start justify-between gap-3 border-b border-ink/10 bg-navy px-5 py-4 md:rounded-t-md">
            <div className="min-w-0">
              <div className="font-display text-base text-ivory">Conseiller virtuel</div>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-gold">
                Assistant automatique
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Fermer le conseiller virtuel"
              className="-mr-1 flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-full text-2xl leading-none text-ivory/70 transition-colors hover:bg-ivory/10 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          >
            {messages.length === 0 && (
              <div className="text-ink-soft">
                <p className="text-[15px] leading-relaxed">
                  Bonjour, je suis l&apos;assistant automatique de Casa Habitat. Décrivez
                  votre recherche et je vous présenterai les biens disponibles.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="min-h-11 touch-manipulation rounded-sm border border-ink/15 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:border-gold hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user"
                      ? "self-end max-w-[85%] break-words rounded-sm bg-navy px-4 py-2.5 text-[15px] text-ivory"
                      : "max-w-full break-words whitespace-pre-wrap text-[15px] leading-relaxed text-ink"
                  }
                >
                  {message.role === "assistant" ? renderText(message.text) : message.text}
                </div>
              ))}
              {status && (
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                  {status}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-ink/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:rounded-b-md"
          >
            <label htmlFor="chat-input" className="sr-only">
              Votre message
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1500}
              disabled={busy}
              placeholder="Votre recherche…"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 rounded-sm border border-ink/15 bg-white px-3 text-[15px] text-ink outline-none focus:border-gold disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Envoyer le message"
              className="flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-sm bg-navy text-ivory transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12h15m0 0-6-6m6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
