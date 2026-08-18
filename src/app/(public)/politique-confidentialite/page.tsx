import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de Casa Habitat.",
  alternates: { canonical: "/politique-confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="pt-36 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-navy text-gold-bright">
          Confidentialité
        </span>
        <h1 className="font-display text-[clamp(28px,3.6vw,42px)] text-ink mb-10">
          Politique de confidentialité
        </h1>

        <div className="text-ink-soft space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-ink mb-2">Données collectées</h2>
            <p>
              Lorsque vous utilisez les formulaires de contact ou d&apos;estimation,
              nous vous demandons votre nom, votre e-mail, votre téléphone et
              le message que vous rédigez. Ces informations sont transmises
              directement par e-mail à {siteConfig.name} — elles ne transitent
              par aucune base de données tierce à ce stade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-2">Favoris</h2>
            <p>
              La liste de vos biens favoris est enregistrée uniquement sur
              votre appareil (stockage local du navigateur) et n&apos;est
              transmise à personne.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-2">Utilisation des données</h2>
            <p>
              Les informations transmises via les formulaires sont utilisées
              exclusivement pour répondre à votre demande (visite, estimation,
              information sur un bien). Elles ne sont ni vendues ni partagées
              avec des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-2">Vos droits</h2>
            <p>
              Vous pouvez à tout moment demander la consultation, la
              correction ou la suppression des données vous concernant en
              écrivant à {siteConfig.contact.email}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink mb-2">Contact</h2>
            <p>
              Pour toute question relative à cette politique, contactez{" "}
              {siteConfig.name} à {siteConfig.contact.email} ou au{" "}
              {siteConfig.contact.phones[0]}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
