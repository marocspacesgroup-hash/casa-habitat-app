const services = [
  {
    num: "01",
    titre: "Vente",
    texte: "Estimation juste, mise en valeur soignée et négociation menée jusqu'à la signature.",
  },
  {
    num: "02",
    titre: "Location",
    texte: "Sélection de locataires, dossiers vérifiés, biens meublés et non meublés.",
  },
  {
    num: "03",
    titre: "Courte durée",
    texte: "Biens meublés prêts à accueillir, pensés pour des séjours de quelques nuits à quelques mois.",
  },
  {
    num: "04",
    titre: "Gestion & conseil",
    texte: "Suivi locatif, encaissements, entretien, et lecture du marché pour les investisseurs.",
  },
];

export default function Services() {
  return (
    <section className="bg-navy py-24 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-14">
          <span className="eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 bg-gold text-navy">
            Ce que nous faisons
          </span>
          <h2 className="font-display text-ivory text-[clamp(26px,3.2vw,38px)]">
            Quatre métiers, <em className="text-gold not-italic italic">une même exigence.</em>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border border-gold/15 divide-x divide-y sm:divide-y-0 divide-gold/15">
          {services.map((s) => (
            <div key={s.num} className="p-8 hover:bg-navy-deep transition-colors">
              <span className="font-mono text-gold text-[11px] tracking-widest mb-6 block">
                {s.num}
              </span>
              <div className="w-11 h-14 border border-gold rounded-t-[22px] rounded-b-[3px] mb-5" />
              <h3 className="text-ivory text-lg font-medium mb-2">{s.titre}</h3>
              <p className="text-ivory/60 text-sm">{s.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
