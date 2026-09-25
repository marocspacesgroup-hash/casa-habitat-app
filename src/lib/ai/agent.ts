import {
  MAX_HISTORY_MESSAGES,
  MAX_RESULTS_PER_REQUEST,
  MAX_TOOL_CALLS,
  MAX_TURNS,
} from "./config";
import { SYSTEM_PROMPT } from "./prompt";
import { getProvider, LlmError } from "./provider";
import {
  createCommercialLead,
  getPropertyDetails,
  requestHumanContact,
  searchProperties,
  TOOL_DEFINITIONS,
} from "./tools";
import type { AgentMessage, AgentToolCall } from "./types";

export type AgentEvent =
  | { type: "status"; label: string }
  | { type: "message"; text: string }
  | { type: "error"; code: AgentErrorCode };

export type AgentErrorCode =
  | "disabled"
  | "message_too_long"
  | "rate_limited"
  | "model_unavailable"
  | "catalogue_unavailable"
  | "no_answer"
  | "internal";

/** Libellé de progression, sans jamais exposer les arguments de l'outil. */
function statusFor(name: string): string {
  if (name === "search_properties") return "Recherche dans le catalogue…";
  if (name === "get_property_details") return "Consultation de la fiche…";
  if (name === "request_human_contact") return "Préparation du contact…";
  if (name === "create_lead") return "Enregistrement de votre demande…";
  return "Traitement…";
}

/**
 * Boucle d'agent.
 *
 * Volontairement écrite à la main plutôt que déléguée à un utilitaire : les
 * plafonds exigés (tours, appels d'outils, résultats cumulés sur toute la
 * requête) doivent rester lisibles et vérifiables en un coup d'œil, et la
 * détection de boucle doit pouvoir interrompre proprement.
 */
export async function* runAgent(params: {
  message: string;
  history: AgentMessage[];
  signal: AbortSignal;
  conversationId: string;
}): AsyncGenerator<AgentEvent> {
  const provider = getProvider();

  const messages: AgentMessage[] = [
    ...params.history.slice(-MAX_HISTORY_MESSAGES),
    { role: "user", text: params.message },
  ];

  // Le consentement doit provenir du message utilisateur courant. L'historique
  // envoyé par le navigateur est utile au dialogue, mais ne constitue pas une
  // preuve fiable de consentement puisqu'il peut être falsifié côté client.
  //
  // Les formulations naturelles de consentement sont acceptées lorsqu'elles
  // expriment clairement l'accord au stockage/recontact : « Oui, je suis
  // d'accord » est notamment une réponse naturelle à la question de consentement
  // posée par l'agent. Un simple « oui » reste volontairement insuffisant.
  const explicitConsent =
    /(?:j['’]?(?:accepte|autorise)|je consens|je suis d['’]accord|je donne mon accord|mon accord est donné|vous pouvez enregistrer|vous pouvez (?:stocker|conserver) (?:mes coordonnées|mes données|mes informations)|d['’]accord,?\s*(?:vous pouvez|j['’]accepte)|i\s+(?:agree|consent)|yes,?\s*(?:i\s+agree|you\s+may\s+(?:store|save)\s+(?:my\s+(?:contact|details|information)|my\s+data))|نعم\s*(?:أوافق|موافق)|أوافق\s*على\s*(?:تسجيل|حفظ)\s*(?:بياناتي|معلوماتي))/iu.test(
      params.message,
    );

  let toolCallsUsed = 0;
  let resultsUsed = 0;
  const callSignatures = new Set<string>();

  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    if (params.signal.aborted) {
      yield { type: "error", code: "model_unavailable" };
      return;
    }

    let result;
    try {
      result = await provider.run({
        system: SYSTEM_PROMPT,
        messages,
        tools: TOOL_DEFINITIONS,
        signal: params.signal,
      });
    } catch (error) {
      const code: AgentErrorCode =
        error instanceof LlmError && error.retryable ? "rate_limited" : "model_unavailable";
      yield { type: "error", code };
      return;
    }

    if (result.stopReason === "refusal") {
      yield { type: "error", code: "no_answer" };
      return;
    }

    // Pas d'appel d'outil : c'est la réponse finale.
    if (result.calls.length === 0) {
      const text = result.text.trim();
      if (!text) {
        yield { type: "error", code: "no_answer" };
        return;
      }
      yield { type: "message", text };
      return;
    }

    messages.push({ role: "assistant", text: result.text, calls: result.calls });

    for (const call of result.calls) {
      if (toolCallsUsed >= MAX_TOOL_CALLS) {
        messages.push({
          role: "tool",
          callId: call.id,
          result: JSON.stringify({
            error:
              "Nombre maximum d'appels d'outils atteint pour cette requête. Répondre avec ce qui est déjà connu, ou inviter à préciser la demande.",
          }),
        });
        continue;
      }

      // Détection de boucle : le même outil avec exactement les mêmes
      // arguments deux fois dans une requête ne produira jamais autre chose.
      const signature = `${call.name}:${JSON.stringify(call.input)}`;
      if (callSignatures.has(signature)) {
        messages.push({
          role: "tool",
          callId: call.id,
          result: JSON.stringify({
            error:
              "Cet appel identique a déjà été effectué dans cette conversation. Utiliser le résultat précédent au lieu de répéter.",
          }),
        });
        continue;
      }
      callSignatures.add(signature);
      toolCallsUsed += 1;

      yield { type: "status", label: statusFor(call.name) };

      try {
        const payload = await executeTool(
          call,
          MAX_RESULTS_PER_REQUEST - resultsUsed,
          params.conversationId,
          explicitConsent,
        );
        if (call.name === "search_properties" && "properties" in payload) {
          resultsUsed += (payload.properties as unknown[]).length;
        }
        messages.push({ role: "tool", callId: call.id, result: JSON.stringify(payload) });
      } catch {
        // Une panne de catalogue ne doit pas remonter en trace technique :
        // le modèle reçoit un message exploitable et poursuit la conversation.
        messages.push({
          role: "tool",
          callId: call.id,
          result: JSON.stringify({
            error:
              "Le catalogue est momentanément indisponible. L'indiquer au visiteur et proposer de réessayer ou de contacter un conseiller.",
          }),
        });
      }
    }
  }

  // Plafond de tours atteint sans réponse finale.
  yield { type: "error", code: "no_answer" };
}

async function executeTool(
  call: AgentToolCall,
  remainingResults: number,
  conversationId: string,
  explicitConsent: boolean,
): Promise<Record<string, unknown>> {
  if (call.name === "search_properties") {
    return { ...(await searchProperties(call.input, remainingResults)) };
  }
  if (call.name === "get_property_details") {
    return { ...(await getPropertyDetails(call.input)) };
  }
  if (call.name === "request_human_contact") {
    return { ...(await requestHumanContact(call.input)) };
  }
  if (call.name === "create_lead") {
    return {
      ...(await createCommercialLead({
        ...call.input,
        conversation_id: conversationId,
        consent: call.input.consent === true && explicitConsent,
      })),
    };
  }
  return { error: "Outil inconnu." };
}

/** Message visiteur associé à chaque code d'erreur. Jamais de trace technique. */
export function userFacingError(code: AgentErrorCode): string {
  switch (code) {
    case "disabled":
      return "Le conseiller virtuel est momentanément indisponible. Vous pouvez nous joindre directement par WhatsApp.";
    case "message_too_long":
      return "Votre message est un peu long. Pouvez-vous le reformuler plus brièvement ?";
    case "rate_limited":
      return "Beaucoup de demandes en ce moment. Merci de réessayer dans un instant.";
    case "catalogue_unavailable":
      return "Le catalogue est momentanément inaccessible. Réessayez dans un instant, ou contactez-nous par WhatsApp.";
    case "model_unavailable":
    case "no_answer":
    case "internal":
    default:
      return "Je n'arrive pas à répondre pour le moment. Vous pouvez reformuler, ou nous joindre par WhatsApp.";
  }
}
