import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { whatsappForListing, whatsappGeneral } from "@/lib/whatsapp";
import { getPublishedListings } from "@/lib/supabase/queries";
import { notifyNewLeadByEmail, type LeadNotificationStatus } from "./notifications";
import type { Listing } from "@/data/types";

export interface CreateLeadInput {
  conversation_id: string;
  transaction_type?: string;
  property_type?: string;
  neighborhood?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms_min?: number;
  surface_min?: number;
  furnished?: boolean;
  name?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  preferred_contact?: string;
  timing?: string;
  urgency?: string;
  occupants?: number;
  viewed_properties?: string[];
  requested_property_reference?: string;
  consent: boolean;
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v.slice(0, max) : undefined;
}

function cleanNumber(value: unknown, min = 0): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= min ? n : undefined;
}

function uniqueRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().slice(0, 32))
      .filter(Boolean)
  )].slice(0, 12);
}

export async function createLead(input: CreateLeadInput): Promise<{
  created: boolean;
  leadId?: string;
  notificationStatus?: LeadNotificationStatus;
  whatsappUrl: string;
  email: string;
  message: string;
}> {
  if (!input.consent) {
    return {
      created: false,
      whatsappUrl: whatsappGeneral(),
      email: siteConfig.contact.email,
      message: "Le consentement explicite est nécessaire avant l'enregistrement d'une demande de contact.",
    };
  }

  const conversationId = cleanText(input.conversation_id, 120);
  const name = cleanText(input.name, 120);
  const phone = cleanText(input.phone, 40);
  const whatsapp = cleanText(input.whatsapp, 40);
  const email = cleanText(input.email, 254);

  if (!conversationId || (!phone && !whatsapp && !email)) {
    return {
      created: false,
      whatsappUrl: whatsappGeneral(),
      email: siteConfig.contact.email,
      message: "Un identifiant de conversation et au moins un moyen de contact sont nécessaires.",
    };
  }

  const leadId = crypto.randomUUID();
  const refs = uniqueRefs(input.viewed_properties);
  const requestedReference = cleanText(input.requested_property_reference, 32);

  // Défense en profondeur : une référence demandée doit correspondre à un
  // bien actuellement publié avant d'être enregistrée dans le CRM. Le modèle
  // ne peut donc pas créer un faux rattachement vers une référence inventée.
  let requestedListing: Listing | undefined;
  if (requestedReference) {
    const listings: Listing[] = await getPublishedListings();
    requestedListing = listings.find((item) => item.reference === requestedReference);
    if (!requestedListing) {
      return {
        created: false,
        whatsappUrl: whatsappGeneral(),
        email: siteConfig.contact.email,
        message: "La référence du bien ne peut pas être confirmée. Ne pas enregistrer la demande comme liée à ce bien ; proposer le contact général.",
      };
    }
  }

  const row = {
    id: leadId,
    conversation_id: conversationId,
    transaction_type: cleanText(input.transaction_type, 40),
    property_type: cleanText(input.property_type, 40),
    neighborhood: cleanText(input.neighborhood, 80),
    budget_min: cleanNumber(input.budget_min),
    budget_max: cleanNumber(input.budget_max),
    bedrooms_min: cleanNumber(input.bedrooms_min),
    surface_min: cleanNumber(input.surface_min),
    furnished: typeof input.furnished === "boolean" ? input.furnished : undefined,
    name,
    phone,
    email,
    whatsapp,
    preferred_contact: cleanText(input.preferred_contact, 30),
    timing: cleanText(input.timing, 120),
    urgency: cleanText(input.urgency, 80),
    occupants: cleanNumber(input.occupants, 1),
    viewed_properties: refs,
    requested_property_reference: requestedReference,
    consent: true,
    consent_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert(row);

  if (error) {
    console.error("[ai] lead creation failed", {
      code: error.code,
      message: error.message,
    });
    return {
      created: false,
      whatsappUrl: whatsappGeneral(),
      email: siteConfig.contact.email,
      message: "La demande de contact n'a pas pu être enregistrée. Proposer néanmoins le contact WhatsApp direct.",
    };
  }

  let whatsappUrl = whatsappGeneral();
  if (requestedListing) {
    whatsappUrl = whatsappForListing(requestedListing, requestedListing.quartierNom);
  }

  const notification = await notifyNewLeadByEmail({
    leadId,
    name,
    phone,
    whatsapp,
    email,
    preferredContact: cleanText(input.preferred_contact, 30),
    transactionType: cleanText(input.transaction_type, 40),
    propertyType: cleanText(input.property_type, 40),
    neighborhood: cleanText(input.neighborhood, 80),
    budgetMin: cleanNumber(input.budget_min),
    budgetMax: cleanNumber(input.budget_max),
    bedroomsMin: cleanNumber(input.bedrooms_min),
    surfaceMin: cleanNumber(input.surface_min),
    furnished: typeof input.furnished === "boolean" ? input.furnished : undefined,
    timing: cleanText(input.timing, 120),
    urgency: cleanText(input.urgency, 80),
    occupants: cleanNumber(input.occupants, 1),
    requestedPropertyReference: requestedReference,
    viewedProperties: refs,
  });

  const message =
    notification.status === "sent"
      ? "Lead enregistré et notification Casa Habitat envoyée. Présenter le lien WhatsApp et l'email professionnel au visiteur. Ne révéler ni l'identifiant interne ni les informations techniques."
      : "Lead enregistré. La notification automatique Casa Habitat n'est pas confirmée ; ne jamais dire qu'un conseiller a été alerté. Présenter le lien WhatsApp et l'email professionnel au visiteur.";

  return {
    created: true,
    leadId,
    notificationStatus: notification.status,
    whatsappUrl,
    email: siteConfig.contact.email,
    message,
  };
}
