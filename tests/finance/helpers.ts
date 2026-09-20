import { createHash } from "node:crypto";
import { createFinanceCircuit, type FinanceCircuit, type Reservation } from "@/lib/ai/finance/circuit";
import { FakeRedis, fakeStore } from "./fake-redis";

/** Secret HMAC de TEST uniquement (jamais utilisé hors des tests). */
export const TEST_HMAC_SECRET = "secret-de-test-hmac-casa-habitat-0123456789";

/** Clé visiteur de test au format attendu par le circuit (64 hex). */
export function vid(n: number | string): string {
  return createHash("sha256").update(`visiteur-test-${n}`).digest("hex");
}

let seq = 0;
export function id(prefix: string): string {
  seq += 1;
  return `${prefix}_${String(seq).padStart(8, "0")}`;
}

export function newCircuit(redis: FakeRedis, jitterMs?: number): FinanceCircuit {
  return createFinanceCircuit(fakeStore(redis, { jitterMs }), "test");
}

/** Admet une requête et renvoie son identifiant (échoue si refusée). */
export async function admitOk(circuit: FinanceCircuit, redis: FakeRedis, visitor: string): Promise<string> {
  const requestId = id("req");
  const decision = await circuit.admit({ requestId, visitor, nowMs: redis.now() });
  if (!decision.allowed) throw new Error(`admission refusée : ${decision.reason}`);
  return requestId;
}

/** Admet puis réserve un appel (échoue si refusé). */
export async function reserveOk(
  circuit: FinanceCircuit,
  redis: FakeRedis,
  visitor: string,
  requestId?: string,
  callId = id("call")
): Promise<Reservation> {
  const req = requestId ?? (await admitOk(circuit, redis, visitor));
  const decision = await circuit.reserve({ callId, requestId: req, visitor, nowMs: redis.now() });
  if (!decision.allowed) throw new Error(`réservation refusée : ${decision.reason}`);
  return decision.reservation;
}
