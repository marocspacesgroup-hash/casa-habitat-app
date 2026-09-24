import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFinanceCircuit } from "@/lib/ai/finance/circuit";
import { runGuardedModelCall } from "@/lib/ai/finance/guarded-call";
import {
  FinanceStoreError,
  createUpstashStore,
  guardedStore,
  type ScriptStore,
} from "@/lib/ai/finance/store";
import { vid } from "./helpers";

const VISITOR = vid("fail-closed");
const NOW = Date.UTC(2026, 8, 17, 10, 0, 0);

const neverAnswers: ScriptStore = { evalScript: () => new Promise(() => {}) };
const throwsError: ScriptStore = {
  evalScript: async () => {
    throw new Error("ECONNRESET");
  },
};
const garbage: ScriptStore = { evalScript: async () => "OK" };

/** Vérifie qu'aucun appel modèle simulé n'a lieu quand le circuit refuse. */
async function expectNoModelCall(store: ScriptStore) {
  const circuit = createFinanceCircuit(store, "test");
  const callModel = vi.fn();
  const result = await runGuardedModelCall({
    circuit,
    visitor: VISITOR,
    requestId: "req_failclosed_1",
    callId: "call_failclosed_1",
    deadlineAt: Date.now() + 200_000,
    now: () => Date.now(),
    signal: new AbortController().signal,
    countTokens: async () => 5_000,
    callModel,
  });
  expect(result).toMatchObject({ status: "refused", reason: "store_unavailable", modelCalled: false });
  expect(callModel).not.toHaveBeenCalled();

  // `toMatchObject` : le refus et son motif sont la règle métier ; un
  // diagnostic safe peut accompagner l'échec (C.3.8-B.6) sans la changer.
  expect(await circuit.admit({ requestId: "req_failclosed_1", visitor: VISITOR, nowMs: NOW })).toMatchObject({
    allowed: false,
    reason: "store_unavailable",
  });
}

describe("fail-closed : store défaillant", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("erreur Redis → refus, aucun appel modèle", async () => {
    await expectNoModelCall(guardedStore(throwsError));
  });

  it("réponse Redis inattendue → refus, aucun appel modèle", async () => {
    await expectNoModelCall(guardedStore(garbage));
  });

  it("timeout Redis : délai total de 1 500 ms par défaut", async () => {
    vi.useFakeTimers();
    const pending = guardedStore(neverAnswers).evalScript("return 1", [], []);
    const outcome = pending.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1_499);
    let settled = false;
    void pending.catch(() => {}).finally(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const error = await outcome;
    expect(error).toBeInstanceOf(FinanceStoreError);
    expect((error as FinanceStoreError).kind).toBe("timeout");
  });

  it("timeout Redis → refus, aucun appel modèle", async () => {
    await expectNoModelCall(guardedStore(neverAnswers, 20));
  });

  it("variables Upstash absentes → refus, aucun appel modèle, aucune requête réseau", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expectNoModelCall(createUpstashStore({}));
    await expectNoModelCall(createUpstashStore({ UPSTASH_REDIS_REST_URL: "https://exemple.invalid" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("n'expose jamais le secret dans l'erreur de configuration", async () => {
    const store = createUpstashStore({ UPSTASH_REDIS_REST_TOKEN: "secret-de-test-123" });
    const error = await store.evalScript("return 1", [], []).catch((e: Error) => e);
    expect(String((error as Error).message)).not.toContain("secret-de-test-123");
  });
});

describe("fail-closed : vrai client Upstash face à un serveur local", () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  async function localServer(handler: Parameters<typeof createServer>[1]): Promise<string> {
    server = createServer(handler);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  }

  const env = (url: string) => ({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: "jeton-de-test" });

  it("format réel : EVAL envoyé avec ses clés, réponse interprétée (admission accordée)", async () => {
    const received: { body: unknown[]; auth?: string }[] = [];
    const url = await localServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        received.push({ body: JSON.parse(raw), auth: req.headers.authorization });
        const encode = req.headers["upstash-encoding"] === "base64";
        const text = (s: string) => (encode ? Buffer.from(s).toString("base64") : s);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ result: [text("admitted")] }));
      });
    });
    const circuit = createFinanceCircuit(createUpstashStore(env(url)), "test");
    expect(await circuit.admit({ requestId: "req_wire_000001", visitor: VISITOR, nowMs: NOW })).toEqual({
      allowed: true,
    });
    expect(received).toHaveLength(1);
    const [command, script, numKeys, ...rest] = received[0].body as string[];
    expect(String(command).toLowerCase()).toBe("eval");
    expect(script).toContain("ZREMRANGEBYSCORE");
    expect(Number(numKeys)).toBe(7);
    expect(rest[0]).toBe("{ch:ai:test}:kill");
    expect(rest[1]).toBe("{ch:ai:test}:rq:req_wire_000001");
    expect(rest[6]).toBe("{ch:ai:test}:pause");
    expect(received[0].auth).toBe("Bearer jeton-de-test");
    // L'identifiant visiteur transmis est un HMAC, jamais une IP.
    expect(JSON.stringify(received[0].body)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });

  it("format réel : réponse RESERVE avec entiers (réservation accordée)", async () => {
    const url = await localServer((req, res) => {
      req.resume();
      req.on("end", () => {
        const encode = req.headers["upstash-encoding"] === "base64";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ result: [encode ? Buffer.from("reserved").toString("base64") : "reserved", 1, 0] }));
      });
    });
    const circuit = createFinanceCircuit(createUpstashStore(env(url)), "test");
    const decision = await circuit.reserve({ callId: "call_wire_00001", requestId: "req_wire_000001", visitor: VISITOR, nowMs: NOW });
    expect(decision).toMatchObject({ allowed: true, alerts: ["budget_day_60"] });
  });

  it("serveur qui ne répond jamais → refus en ~1,5 s", async () => {
    const url = await localServer(() => {
      /* aucune réponse */
    });
    const started = Date.now();
    await expectNoModelCall(createUpstashStore(env(url)));
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2 * 1_500 + 1_000);
    server?.closeAllConnections();
  }, 10_000);

  it("serveur en erreur HTTP 500 → refus", async () => {
    const url = await localServer((_req, res) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "ERR interne" }));
    });
    await expectNoModelCall(createUpstashStore(env(url)));
  });

  it("serveur injoignable (connexion refusée) → refus", async () => {
    const url = await localServer(() => {});
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    await expectNoModelCall(createUpstashStore(env(url)));
  });
});
