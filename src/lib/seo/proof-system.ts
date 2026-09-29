import { siteConfig } from "@/config/site";

export type ProofLevel = "verified" | "declared" | "to_document" | "prohibited";

export type ProofSourceType =
  | "official"
  | "regulatory"
  | "casa_habitat"
  | "recognized_local"
  | "authentic_client"
  | "external";

export type ProofRecord = {
  id: string;
  level: ProofLevel;
  sourceType: ProofSourceType;
  claim: string;
  source: string;
  verifiedAt?: string;
  notes?: string;
};

/**
 * Proof System — registre minimal et auditable.
 *
 * Règle : aucune preuve ne doit être publiée comme "verified" sans source
 * identifiable. Les niveaux "declared" et "to_document" ne doivent pas être
 * transformés en résultats, chiffres ou témoignages publics sans validation.
 */
export const proofRecords = [
  {
    id: "identity-brand",
    level: "verified",
    sourceType: "casa_habitat",
    claim: "Casa Habitat est le nom commercial utilisé par le site officiel.",
    source: "siteConfig.name + domaine officiel",
  },
  {
    id: "official-domain",
    level: "verified",
    sourceType: "casa_habitat",
    claim: "Le domaine officiel de Casa Habitat est casahabitatmaroc.com.",
    source: "siteConfig.url",
  },
  {
    id: "operational-contact",
    level: "verified",
    sourceType: "casa_habitat",
    claim: "Casa Habitat publie une adresse opérationnelle et des coordonnées professionnelles.",
    source: "siteConfig.contact",
  },
  {
    id: "legal-identity",
    level: "verified",
    sourceType: "regulatory",
    claim: "L'identité légale publiée par le site comprend YKSD INTERNATIONAL GROUP, SARL, RC, ICE et IF.",
    source: "siteConfig.legal",
    notes: "Les informations doivent rester conformes aux documents légaux à jour.",
  },
  {
    id: "experience",
    level: "declared",
    sourceType: "casa_habitat",
    claim: "Casa Habitat déclare une expérience de plus de cinq ans dans la location à Casablanca.",
    source: "déclaration de Casa Habitat",
    notes: "Ne pas présenter cette durée comme une preuve documentaire tant qu'une source indépendante ou un document n'est pas archivé.",
  },
  {
    id: "client-testimonials",
    level: "to_document",
    sourceType: "authentic_client",
    claim: "Les témoignages clients doivent provenir d'expériences authentiques et être publiés avec une attribution appropriée.",
    source: "à documenter",
  },
  {
    id: "quantified-results",
    level: "prohibited",
    sourceType: "casa_habitat",
    claim: "Aucun chiffre de performance, rendement, satisfaction ou volume ne doit être publié sans preuve vérifiable.",
    source: "règle éditoriale Proof System",
  },
] satisfies readonly ProofRecord[];

export function getProofRecord(id: string) {
  return proofRecords.find((record) => record.id === id);
}

export function isPublishableProof(record: ProofRecord) {
  return record.level === "verified";
}

export function getPublishableProofs() {
  return proofRecords.filter(isPublishableProof);
}

export function validateProofRecords(records: readonly ProofRecord[]) {
  return records.every(
    (record) =>
      record.id.trim().length > 0 &&
      record.claim.trim().length > 0 &&
      record.source.trim().length > 0,
  );
}

export const proofSystemVersion = "1.0.0";
export const proofSystemBrand = siteConfig.name;
