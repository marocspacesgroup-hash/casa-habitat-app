"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { neighborhoods } from "@/data/neighborhoods";

const transactionRoutes: Record<string, string> = {
  location: "/locations",
  vente: "/vente",
  "courte-duree": "/courte-duree",
};

export default function SearchBar() {
  const router = useRouter();
  const [transaction, setTransaction] = useState("location");
  const [typeBien, setTypeBien] = useState("");
  const [quartier, setQuartier] = useState("");
  const [prixMin, setPrixMin] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [chambres, setChambres] = useState("");
  const [sallesDeBain, setSallesDeBain] = useState("");
  const [surfaceMin, setSurfaceMin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (typeBien) params.set("type", typeBien);
    if (quartier) params.set("quartier", quartier);
    if (prixMin) params.set("prixMin", prixMin);
    if (prixMax) params.set("prixMax", prixMax);
    if (chambres) params.set("chambres", chambres);
    if (sallesDeBain) params.set("sdb", sallesDeBain);
    if (surfaceMin) params.set("surfaceMin", surfaceMin);
    const base = transactionRoutes[transaction] ?? "/locations";
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  };

  const selectClass =
    "w-full bg-transparent border-b border-ink/15 focus:border-gold outline-none py-2 text-sm text-ink";
  const labelClass =
    "font-mono text-[10px] uppercase tracking-widest text-ink-soft mb-1.5 block";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur rounded-sm shadow-xl shadow-black/10 p-6 md:p-8"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
        <div>
          <label className={labelClass} htmlFor="transaction">
            Transaction
          </label>
          <select
            id="transaction"
            className={selectClass}
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
          >
            <option value="location">Location</option>
            <option value="vente">Vente</option>
            <option value="courte-duree">Courte durée</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="typeBien">
            Type de bien
          </label>
          <select
            id="typeBien"
            className={selectClass}
            value={typeBien}
            onChange={(e) => setTypeBien(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="appartement">Appartement</option>
            <option value="studio">Studio</option>
            <option value="villa">Villa</option>
            <option value="bureau">Bureau</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="quartier">
            Quartier
          </label>
          <select
            id="quartier"
            className={selectClass}
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
          >
            <option value="">Tous</option>
            {neighborhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="surfaceMin">
            Surface min. (m²)
          </label>
          <input
            id="surfaceMin"
            type="number"
            min="0"
            className={selectClass}
            value={surfaceMin}
            onChange={(e) => setSurfaceMin(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        <div>
          <label className={labelClass} htmlFor="prixMin">
            Prix min. (DH)
          </label>
          <input
            id="prixMin"
            type="number"
            min="0"
            className={selectClass}
            value={prixMin}
            onChange={(e) => setPrixMin(e.target.value)}
            placeholder="—"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="prixMax">
            Prix max. (DH)
          </label>
          <input
            id="prixMax"
            type="number"
            min="0"
            className={selectClass}
            value={prixMax}
            onChange={(e) => setPrixMax(e.target.value)}
            placeholder="—"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="chambres">
            Chambres
          </label>
          <input
            id="chambres"
            type="number"
            min="0"
            className={selectClass}
            value={chambres}
            onChange={(e) => setChambres(e.target.value)}
            placeholder="—"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sdb">
            Salles de bain
          </label>
          <input
            id="sdb"
            type="number"
            min="0"
            className={selectClass}
            value={sallesDeBain}
            onChange={(e) => setSallesDeBain(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full md:w-auto bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-10 py-3.5 rounded-sm hover:bg-gold-bright transition-colors"
      >
        Rechercher
      </button>
    </form>
  );
}
