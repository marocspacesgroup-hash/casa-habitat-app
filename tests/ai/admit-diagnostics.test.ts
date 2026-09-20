import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/tools", async () => {
  const { TOOL_DEFINITIONS_STUB } = await import("./helpers");
  return {
    TOOL_DEFINITIONS: TOOL_DEFINITIONS_STUB,
    searchProperties: vi.fn(),
    getPropertyDetails: vi.fn(),
    requestHumanContact: vi.fn(),
  };
});

import { randomUUID } from "node:crypto";
import { runAgent } from "@/lib/ai/agent";
import { createChatHandler, structuredLog } from "@/lib/ai/chat-handler";
import { createFinanceCircuit } from "@/lib/ai/finance/circuit";
import { createUpstashStore, type ScriptStore } from "@/lib/ai/finance/store";
import { ADMIT_SCRIPT } from "@/lib/ai/finance/scripts";
import { FakeRedis } from "../finance/fake-redis";
import { faultyStore, type Fault } from "../finance/fault-store";
import { TEST_HMAC_SECRET } from "../finance/helpers";
import { fakeProvider, readSse, textTurn } from "./helpers";

/**
 * Observabilité du refus ADMIT (C.3.8-B.6).
 *
 * Le refus reste identique (fail-closed, `store_unavailable`, HTTP 503) ; seul
 * le diagnostic du store, déjà produit par `guardedStore`, cesse d'être perdu.
 * Les journaux inspectés sont ceux de PRODUCTION (`structuredLog`).
 */

const VISITOR = "a".repeat(64);
const NOW = Date.UTC(2026, 8, 20, 10, 0, 0);
const SECRET_ARG = "argument-secret";

let lines: string[];
let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  lines = [];
  info = vi.spyOn(console, "info").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
});
afterEach(() => info.mockRestore());

function circuitWith(plan: Record<string, Fault[]>) {
  return createFinanceCircuit(faultyStore(new FakeRedis(NOW), new Map(Object.entries(plan))), "test");
}

const admit = (circuit: ReturnType<typeof circuitWith>) =>
  circuit.admit({ requestId: "req_diag_000001", visitor: VISITOR, nowMs: NOW });

describe("ADMIT : le diagnostic du store est conservé", () => {
  it("timeout : refus inchangé, genre « timeout » et délai journalisables", async () => {
    const decision = await admit(circuitWith({ [ADMIT_SCRIPT]: ["timeout_before"] }));
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "store_unavailable" });
    expect(decision.allowed === false && decision.diag).toMatchObject({ storeKind: "timeout", errorClass: "FinanceStoreError", timeoutMs: 30 });
  });

  it("erreur Upstash : genre « unavailable », classe UpstashError, aucune commande conservée", async () => {
    const decision = await admit(circuitWith({ [ADMIT_SCRIPT]: ["upstash"] }));
    expect(decision).toMatchObject({ allowed: false, reason: "store_unavailable" });
    const diag = decision.allowed === false ? decision.diag : undefined;
    expect(diag).toMatchObject({ storeKind: "unavailable", errorClass: "UpstashError" });
    expect(JSON.stringify(diag)).not.toMatch(/ch:ai|EVAL|command|[a-f0-9]{64}/);
  });

  it("erreur réseau : classe TypeError et code réseau en liste blanche", async () => {
    const decision = await admit(circuitWith({ [ADMIT_SCRIPT]: ["network"] }));
    expect(decision).toMatchObject({ allowed: false, reason: "store_unavailable" });
    expect(decision.allowed === false && decision.diag).toMatchObject({
      storeKind: "unavailable",
      errorClass: "TypeError",
      errorCode: "ECONNRESET",
    });
  });

  it("configuration absente : refus sans requête réseau ET sans diagnostic", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const decision = await admit(createFinanceCircuit(createUpstashStore({}), "test"));
    // `unconfiguredStore` n'est pas enveloppé par `guardedStore` : il lève avant
    // toute mesure, donc AUCUN diagnostic n'existe. L'absence de `storeKind`
    // distingue donc ce cas de tous les échecs mesurés (timeout, réseau, HTTP).
    expect(decision).toEqual({ allowed: false, reason: "store_unavailable", diag: undefined });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("réponse inexploitable : genre « bad_reply », refus conservé", async () => {
    const decision = await admit(circuitWith({ [ADMIT_SCRIPT]: ["bad_reply"] }));
    expect(decision).toMatchObject({ allowed: false, reason: "store_unavailable" });
    expect(decision.allowed === false && decision.diag).toMatchObject({ storeKind: "bad_reply", errorClass: "BadReply" });
  });

  it("erreur sans diagnostic : refus identique, aucun diagnostic inventé", async () => {
    const naked: ScriptStore = {
      async evalScript() {
        throw new Error(`panne sans diagnostic ${SECRET_ARG}`);
      },
    };
    const decision = await admit(createFinanceCircuit(naked, "test"));
    expect(decision).toEqual({ allowed: false, reason: "store_unavailable", diag: undefined });
  });

  it("refus métier : aucun diagnostic ajouté", async () => {
    const redis = new FakeRedis(NOW);
    redis.set("{ch:ai:test}:kill", "budget");
    const circuit = createFinanceCircuit(faultyStore(redis, new Map()), "test");
    expect(await admit(circuit)).toEqual({ allowed: false, reason: "killed" });
  });
});

describe("handler : admit_refused journalise le diagnostic, jamais un secret", () => {
  const model = fakeProvider([textTurn("réponse")]);

  function post(store: ScriptStore) {
    const handle = createChatHandler(() => ({
      enabled: true,
      circuit: createFinanceCircuit(store, "test"),
      provider: model.provider,
      visitorSecret: TEST_HMAC_SECRET,
      now: () => NOW,
      log: structuredLog,
      newRequestId: randomUUID,
      runAgent,
      sleep: async () => {},
    }));
    return handle(
      new Request("https://www.casahabitatmaroc.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
        body: JSON.stringify({ message: "Je cherche un appartement lumineux" }),
      })
    );
  }

  it("erreur Upstash : 503, reason inchangé, champs de diagnostic présents", async () => {
    const response = await post(faultyStore(new FakeRedis(NOW), new Map([[ADMIT_SCRIPT, ["upstash"] as Fault[]]])));
    expect(response.status).toBe(503);
    const events = await readSse(response);
    expect(events.map((e) => e.type)).toEqual(["error", "done"]);
    // Fail-closed : aucun appel modèle, aucun comptage de jetons.
    expect(model.creates).toHaveLength(0);
    expect(model.counts).toHaveLength(0);

    const log = lines.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.event === "admit_refused");
    expect(log).toMatchObject({
      event: "admit_refused",
      reason: "store_unavailable",
      storeKind: "unavailable",
      errorClass: "UpstashError",
      timeoutMs: 30,
    });
    expect(typeof log!.elapsedMs).toBe("number");
    // Liste blanche : ni message d'erreur, ni clé Redis, ni identifiant visiteur complet.
    const raw = lines.join("\n");
    expect(raw).not.toMatch(/ch:ai|EVAL|command was|fetch failed/);
    expect(raw).not.toContain(TEST_HMAC_SECRET);
    expect(raw).not.toContain(VISITOR);
    expect(raw).not.toContain("198.51.100.77");
  });

  it("diagnostic absent : 503 et journal sans champ de diagnostic", async () => {
    const naked: ScriptStore = {
      async evalScript() {
        throw new Error(`panne sans diagnostic ${SECRET_ARG}`);
      },
    };
    const response = await post(naked);
    expect(response.status).toBe(503);
    await readSse(response);
    const log = lines.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.event === "admit_refused");
    expect(log).toMatchObject({ reason: "store_unavailable" });
    expect(log).not.toHaveProperty("storeKind");
    expect(log).not.toHaveProperty("errorClass");
    expect(lines.join("\n")).not.toContain(SECRET_ARG);
  });
});
