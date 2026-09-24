import { handleChatRequest } from "@/lib/ai/chat-handler";

/**
 * Route du conseiller virtuel — adaptateur HTTP mince.
 *
 * Toute la logique (échéance, admission Redis, lecture bornée, agent sous
 * contrôle financier, libération de la place) vit dans `lib/ai/chat-handler.ts`,
 * testable sans Next.js. Seule la méthode POST est exportée : Next.js répond
 * 405 aux autres méthodes.
 *
 * Runtime Node (et non Edge) : le SDK Anthropic, Upstash et le client Supabase
 * serveur s'y comportent de façon prévisible.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Durée maximale de la fonction (s) ; l'échéance applicative est de 210 s. */
export const maxDuration = 300;

export async function POST(request: Request) {
  return handleChatRequest(request);
}
