import { siteConfig } from "@/config/site";

export type LeadNotificationStatus = "sent" | "not_configured" | "failed";

export interface LeadNotificationInput {
  leadId: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  preferredContact?: string;
  transactionType?: string;
  propertyType?: string;
  neighborhood?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedroomsMin?: number;
  surfaceMin?: number;
  furnished?: boolean;
  timing?: string;
  urgency?: string;
  occupants?: number;
  requestedPropertyReference?: string;
  viewedProperties?: string[];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function optional(value: unknown): string {
  const v = String(value ?? "").trim();
  return v ? escapeHtml(v) : "Non renseigné";
}

function numberValue(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-MA").format(value)
    : "Non renseigné";
}

function rows(input: LeadNotificationInput): string {
  const items: Array<[string, string]> = [
    ["Nom", optional(input.name)],
    ["Téléphone", optional(input.phone)],
    ["WhatsApp", optional(input.whatsapp)],
    ["Email", optional(input.email)],
    ["Canal préféré", optional(input.preferredContact)],
    ["Transaction", optional(input.transactionType)],
    ["Type de bien", optional(input.propertyType)],
    ["Quartier", optional(input.neighborhood)],
    ["Budget min.", numberValue(input.budgetMin) + " DH"],
    ["Budget max.", numberValue(input.budgetMax) + " DH"],
    ["Chambres min.", numberValue(input.bedroomsMin)],
    ["Surface min.", numberValue(input.surfaceMin) + " m²"],
    ["Meublé", typeof input.furnished === "boolean" ? (input.furnished ? "Oui" : "Non") : "Non renseigné"],
    ["Délai", optional(input.timing)],
    ["Urgence", optional(input.urgency)],
    ["Occupants", numberValue(input.occupants)],
    ["Bien demandé", optional(input.requestedPropertyReference)],
    ["Biens présentés", optional(input.viewedProperties?.join(", "))],
  ];

  return items
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${value}</td></tr>`,
    )
    .join("");
}

function html(input: LeadNotificationInput): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f5f5f2;font-family:Arial,sans-serif;color:#172019;">
    <div style="max-width:680px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:24px;background:#0d1f14;color:#fff;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8;">Casa Habitat</div>
        <h1 style="margin:8px 0 0;font-size:24px;">Nouveau prospect IA</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin-top:0;">Une demande commerciale a été enregistrée avec consentement explicite depuis l'assistant immobilier.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows(input)}</table>
        <p style="margin:20px 0 0;font-size:12px;color:#6b7280;">Référence interne du lead : ${escapeHtml(input.leadId)}</p>
      </div>
    </div>
  </body>
</html>`;
}

function text(input: LeadNotificationInput): string {
  return [
    "NOUVEAU PROSPECT IA - CASA HABITAT",
    "",
    `Nom : ${input.name ?? "Non renseigné"}`,
    `Téléphone : ${input.phone ?? "Non renseigné"}`,
    `WhatsApp : ${input.whatsapp ?? "Non renseigné"}`,
    `Email : ${input.email ?? "Non renseigné"}`,
    `Canal préféré : ${input.preferredContact ?? "Non renseigné"}`,
    `Transaction : ${input.transactionType ?? "Non renseigné"}`,
    `Type : ${input.propertyType ?? "Non renseigné"}`,
    `Quartier : ${input.neighborhood ?? "Non renseigné"}`,
    `Budget : ${input.budgetMin ?? "?"} - ${input.budgetMax ?? "?"} DH`,
    `Chambres min. : ${input.bedroomsMin ?? "Non renseigné"}`,
    `Surface min. : ${input.surfaceMin ?? "Non renseigné"} m²`,
    `Meublé : ${typeof input.furnished === "boolean" ? (input.furnished ? "Oui" : "Non") : "Non renseigné"}`,
    `Délai : ${input.timing ?? "Non renseigné"}`,
    `Urgence : ${input.urgency ?? "Non renseignée"}`,
    `Occupants : ${input.occupants ?? "Non renseigné"}`,
    `Bien demandé : ${input.requestedPropertyReference ?? "Non renseigné"}`,
    `Biens présentés : ${input.viewedProperties?.join(", ") || "Aucun"}`,
    "",
    `Lead ID : ${input.leadId}`,
  ].join("\n");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function notifyNewLeadByEmail(
  input: LeadNotificationInput,
): Promise<{ status: LeadNotificationStatus; providerId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFICATION_EMAIL || siteConfig.contact.email;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from || !to) {
    console.warn("[ai] lead notification email is not configured");
    return { status: "not_configured" };
  }

  const payload = {
    from,
    to: [to],
    subject: input.requestedPropertyReference
      ? `Nouveau prospect IA · ${input.requestedPropertyReference}`
      : "Nouveau prospect IA · Casa Habitat",
    html: html(input),
    text: text(input),
  };

  const idempotencyKey = `lead-notification/${input.leadId}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | { id?: string; message?: string; name?: string }
        | null;

      if (response.ok) {
        return { status: "sent", providerId: body?.id };
      }

      console.error("[ai] lead notification email failed", {
        attempt,
        status: response.status,
        error: body?.message || body?.name || "unknown",
      });
    } catch (error) {
      console.error("[ai] lead notification email request failed", {
        attempt,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    if (attempt < 3) await sleep(500 * 2 ** (attempt - 1));
  }

  return { status: "failed" };
}
