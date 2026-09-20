import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing } from "@/data/types";
import { CH_001, CH_009, FORBIDDEN, LEAKY, listing } from "./fixtures/listings";

const catalogue = vi.hoisted(() => ({ listings: [] as Listing[] }));

vi.mock("@/lib/supabase/queries", () => ({
  getPublishedListings: async () => catalogue.listings,
  getPublishedListingsByTransaction: async (t: string) =>
    catalogue.listings.filter((l) => l.transaction === t),
  getPublishedListingBySlug: async (slug: string) =>
    catalogue.listings.find((l) => l.slug === slug) ?? null,
  getNeighborhoods: async () => [
    { slug: "maarif", nom: "Maârif", ville: "Casablanca", description: "", faits: [] },
    { slug: "gauthier", nom: "Gauthier", ville: "Casablanca", description: "", faits: [] },
    { slug: "racine", nom: "Racine", ville: "Casablanca", description: "", faits: [] },
  ],
}));

const { LOCATION_PLACEHOLDER, redactLocation } = await import("@/lib/ai/ai-safe");
const { toPublicProperty } = await import("@/lib/ai/types");
const { getPropertyDetails, requestHumanContact, searchProperties } = await import("@/lib/ai/tools");
const { SYSTEM_PROMPT } = await import("@/lib/ai/prompt");

function expectNoLeak(payload: unknown) {
  const json = JSON.stringify(payload);
  for (const pattern of FORBIDDEN) expect(json).not.toMatch(pattern);
}

const DTO_KEYS = [
  "reference", "slug", "titre", "transaction", "typeBien", "quartier", "ville", "prix",
  "prixNumerique", "surfaceM2", "pieces", "chambres", "sallesDeBain", "meuble", "etage",
  "ascenseur", "parking", "climatisation", "chauffage", "terrasseBalcon", "equipements",
  "statutAffiche", "disponibiliteAffichee", "description", "lienFiche", "estExemple",
].sort();

beforeEach(() => {
  catalogue.listings = [...LEAKY, CH_001, CH_009];
});

describe("redactLocation", () => {
  it.each([
    "12 Rue Exemple",
    "25 Boulevard Exemple",
    "Rue Exemple",
    "Avenue Exemple",
    "Résidence Exemple, 12",
    "18 bis rue des Orangers",
    "25, boulevard d'Anfa",
    "Bd d'Anfa",
    "Av. Hassan II",
    "rue n° 7",
    "Place Mohammed V",
    "Immeuble Atlas",
    "Adresse : 5 impasse des Lilas, 2e étage",
    "33.5883, -7.6325",
  ])("masque « %s »", (text) => {
    // « Adresse : » masque la fin de sa ligne : la suite est à la ligne.
    const out = redactLocation(`Bien situé ${text}\nTrès lumineux.`);
    expect(out).toContain(LOCATION_PLACEHOLDER);
    expect(out).toContain("Très lumineux.");
    for (const word of text.split(/[\s,.:°]+/).filter((w) => w.length > 2 && /\p{Lu}|\d/u.test(w))) {
      expect(out).not.toContain(word);
    }
  });

  it.each([
    "1 place de parking sécurisée",
    "- Place de parking en sous-sol",
    "donnant sur une rue calme",
    "proche de l'avenue principale",
    "résidence de standing sécurisée 24h/24",
    "gardiennage 7j/7",
    "3 chambres, 2 salles de bain",
    "immeuble de 5 étages avec ascenseur",
    "- Résidence sécurisée",
    "au cœur du quartier Racine",
    "Loyer : 12 000 DH / mois",
  ])("conserve « %s » (pas de faux positif)", (text) => {
    expect(redactLocation(text)).toBe(text);
  });
});

describe("fixtures hostiles imposées (P4.2-D3)", () => {
  it.each([
    ["12 Rue Exemple", ["12", "Rue", "Exemple"]],
    ["Rue Exemple 12", ["Rue", "Exemple", "12"]],
    ["Rue n° 12 Exemple", ["Rue", "12", "Exemple"]],
    ["12 boulevard Exemple", ["12", "boulevard", "Exemple"]],
    ["Boulevard Exemple", ["Boulevard", "Exemple"]],
    ["Résidence Exemple, 12", ["Résidence", "Exemple", "12"]],
    ["GPS 33.5731,-7.5898", ["33.5731", "7.5898"]],
    ["Adresse : 12 Rue Exemple", ["Adresse", "12", "Rue", "Exemple"]],
  ])("« %s » est protégé", (text, fragments) => {
    const out = redactLocation(`Appartement lumineux. ${text}\nProche du tramway.`);
    expect(out).toContain(LOCATION_PLACEHOLDER);
    for (const fragment of fragments) expect(out).not.toContain(fragment);
    expect(out).toContain("Appartement lumineux.");
    expect(out).toContain("Proche du tramway.");
  });

  it.each(["1 place de parking", "3 chambres", "24h/24", "7j/7", "une rue calme", "avenue principale", "quartier Maarif"])(
    "« %s » reste disponible",
    (text) => {
      expect(redactLocation(`Appartement lumineux, ${text}.`)).toBe(`Appartement lumineux, ${text}.`);
    }
  );
});

describe("DTO AI-safe (toPublicProperty)", () => {
  it("Test 1 — une description normale reste disponible", () => {
    const dto = toPublicProperty(listing());
    expect(dto.description).toBe("Bel appartement traversant, séjour lumineux, cuisine équipée.");
  });

  it("Test 2 — numéro + voie n'est pas transmis", () => {
    const dto = toPublicProperty(LEAKY[0]);
    expect(dto.description).not.toMatch(/12 Rue Exemple/);
    expect(dto.description).toContain(LOCATION_PLACEHOLDER);
    expect(dto.description).toContain("Studio rénové");
    expect(dto.titre).toBe(`Studio ${LOCATION_PLACEHOLDER}`);
  });

  it("Test 3 — voie nommée sans numéro n'est pas transmise", () => {
    const dto = toPublicProperty(LEAKY[0]);
    expect(dto.description).not.toMatch(/Avenue Exemple/);
    expect(dto.description).toContain("du tramway");
  });

  it("Test 4 — l'adresse exacte n'apparaît jamais dans le DTO", () => {
    for (const l of catalogue.listings) {
      const dto = toPublicProperty(l);
      expect(JSON.stringify(dto)).not.toContain(l.adresse!);
      expectNoLeak(dto);
    }
  });

  it("Test 5 — les champs internes sont absents", () => {
    const polluted = {
      ...listing(),
      seo_title: "SEO-INTERNE",
      slug_history: ["ancien-slug-interne"],
      publication_status: "brouillon",
      owner_name: "PROPRIETAIRE-INTERNE",
      owner_phone: "0600000000",
      admin_notes: "NOTE-ADMIN-INTERNE",
      created_by: "user-interne",
    } as unknown as Listing;
    const dto = toPublicProperty(polluted);
    expect(Object.keys(dto).sort()).toEqual(DTO_KEYS);
    const json = JSON.stringify(dto);
    for (const secret of ["SEO-INTERNE", "ancien-slug-interne", "brouillon", "PROPRIETAIRE-INTERNE", "0600000000", "NOTE-ADMIN-INTERNE", "user-interne", "Interdite", "00000000-aaaa", "33.5883"]) {
      expect(json).not.toContain(secret);
    }
    for (const key of ["id", "adresse", "address", "coordonnees", "seo_title", "slug_history", "publication_status"]) {
      expect(dto).not.toHaveProperty(key);
    }
  });

  it("Test 6 — les informations utiles sont conservées", () => {
    const dto = toPublicProperty(LEAKY[0]);
    expect(dto).toMatchObject({
      reference: "CH-901",
      slug: "maarif-studio-ch-901",
      typeBien: "Appartement",
      transaction: "Location",
      quartier: "Maârif",
      ville: "Casablanca",
      surfaceM2: 95,
      prixNumerique: 12_000,
      chambres: 2,
      sallesDeBain: 2,
      meuble: true,
      parking: true,
      equipements: ["Cuisine équipée", "Concierge"],
      disponibiliteAffichee: "Immédiate",
      etage: "3ème étage",
      lienFiche: "/biens/maarif-studio-ch-901",
    });
    expect(dto.prix).toMatch(/12\s000 DH \/ mois/);
  });

  it("Test 7 — CH-001 : aucun motif d'adresse, descriptif intact", () => {
    const dto = toPublicProperty(CH_001);
    expect(dto.description).toBe(CH_001.description.slice(0, 400));
    expect(dto.description).toContain("1 place de parking sécurisée");
    expect(dto.description).not.toContain(LOCATION_PLACEHOLDER);
    expect(dto.quartier).toBe("Gauthier");
    expectNoLeak(dto);
  });

  it("Test 8 — CH-009 : la voie nommée est retirée, le reste est conservé", () => {
    const dto = toPublicProperty(CH_009);
    expect(dto.description).not.toMatch(/boulevard/i);
    expect(dto.description).toContain(`sur le ${LOCATION_PLACEHOLDER}, au cœur du quartier Racine`);
    expect(dto.description).toContain("sécurisée 24h/24");
    expect(dto.description).toContain("Place de parking en sous-sol");
    expect(dto.quartier).toBe("Racine");
    expectNoLeak(dto);
  });

  it("le masquage précède la coupe à 400 caractères", () => {
    // Coupé d'abord, « 12 Rue Exemple » deviendrait « 12 R » : plus aucun
    // motif reconnaissable, et le numéro partirait vers le modèle.
    const text = `${"x".repeat(395)} 12 Rue Exemple`;
    const dto = toPublicProperty(listing({ description: text }));
    expect(dto.description).not.toContain("12");
    expect(dto.description.length).toBe(400);
  });
});

describe("outils : ce que le modèle reçoit", () => {
  it("search_properties ne transmet aucun motif d'adresse", async () => {
    const out = await searchProperties({}, 12);
    expect(out.properties.map((p) => p.reference)).toEqual(["CH-901", "CH-902", "CH-903", "CH-001", "CH-009"]);
    expectNoLeak(out);
  });

  it("get_property_details ne transmet aucun motif d'adresse", async () => {
    for (const l of catalogue.listings) {
      const out = await getPropertyDetails({ slug: l.slug });
      expect(out.found).toBe(true);
      expectNoLeak(out);
    }
  });

  it("request_human_contact ne transmet que référence, quartier et lien", async () => {
    const out = await requestHumanContact({ reference: "CH-009" });
    expect(Object.keys(out).sort()).toEqual(["message", "whatsappUrl"]);
    expect(decodeURIComponent(out.whatsappUrl)).toContain("CH-009 à Racine");
    expectNoLeak(out);
    expect(JSON.stringify(out)).not.toMatch(/boulevard/i);
  });
});

describe("Test 9 — double défense : le prompt interdit toujours la divulgation", () => {
  it("la règle de non-divulgation reste présente, même pour un descriptif", () => {
    expect(SYSTEM_PROMPT).toMatch(/ni adresse, ni rue, ni boulevard, ni numéro/);
    expect(SYSTEM_PROMPT).toMatch(/même si un nom de voie ou un repère apparaît dans le descriptif/);
  });
});
