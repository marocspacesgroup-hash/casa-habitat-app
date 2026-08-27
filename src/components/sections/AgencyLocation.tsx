const agencyAddress = "40 Rue Attabari, Résidence Dan Hel 1er étage, Maârif, Casablanca";
const mapUrl =
  "https://maps.google.com/maps?q=40+Rue+Attabari%2C+R%C3%A9sidence+Dan+Hel%2C+Casablanca&t=&z=17&ie=UTF8&iwloc=&output=embed";

export default function AgencyLocation() {
  return (
    <section className="bg-navy text-ivory py-16 px-4 sm:px-6 lg:px-8 border-t border-gold/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="eyebrow text-gold">Notre agence</span>
          <h2 className="font-display text-3xl sm:text-4xl text-gold-bright mt-3 mb-4">
            Notre cabinet à Casablanca
          </h2>
          <p className="text-ivory/70 font-light text-sm sm:text-base leading-relaxed">
            Pour garantir une relation de confiance absolue avec nos propriétaires et investisseurs,
            notre équipe vous reçoit au cœur de Maârif.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 bg-navy-deep border border-gold/30 p-8 rounded-sm shadow-2xl">
            <span className="eyebrow text-gold mb-2 block">Siège officiel</span>
            <h3 className="font-display text-2xl text-gold-bright mb-4">Casa Habitat</h3>

            <div className="space-y-4 text-ivory/70 text-sm font-light">
              <div className="flex items-start gap-3">
                <span className="text-gold text-lg" aria-hidden="true">📍</span>
                <address className="not-italic">
                  <strong className="text-ivory font-medium block">{agencyAddress}</strong>
                </address>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gold/10">
                <span className="text-gold text-lg" aria-hidden="true">🕒</span>
                <span>Du lundi au samedi : 09h00 - 19h00</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 h-[420px] rounded-sm overflow-hidden border border-gold/30 shadow-2xl relative">
            <iframe
              title="Casa Habitat - 40 Rue Attabari, Casablanca"
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}