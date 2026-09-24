import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { classifyStoreError, createUpstashStore, FinanceStoreError, guardedStore, type ScriptStore } from "@/lib/ai/finance/store";

/**
 * Diagnostic W1 du store : classes et codes en liste blanche, jamais de
 * message d'erreur, tentatives HTTP comptées pour l'opération elle-même.
 */

async function failure(store: ScriptStore): Promise<FinanceStoreError> {
  const error = await store.evalScript("return 1", ["{ch:ai:test}:x"], ["argument-secret"]).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(FinanceStoreError);
  return error as FinanceStoreError;
}

describe("classifyStoreError", () => {
  it.each([
    [Object.assign(new Error("x"), { name: "TimeoutError" }), { errorClass: "TimeoutError" }],
    [Object.assign(new Error("x"), { name: "UpstashError" }), { errorClass: "UpstashError" }],
    [new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }), { errorClass: "TypeError", errorCode: "ECONNREFUSED" }],
    [Object.assign(new Error("x"), { name: "ClasseInventée", code: "UND_ERR_CONNECT_TIMEOUT" }), { errorClass: "Other", errorCode: "UND_ERR_CONNECT_TIMEOUT" }],
    [Object.assign(new Error("x"), { code: "code avec espaces" }), { errorClass: "Other" }],
    [Object.assign(new Error("x"), { code: "econnreset" }), { errorClass: "Other" }],
    [Object.assign(new Error("x"), { code: "A".repeat(40) }), { errorClass: "Other" }],
    ["chaîne", { errorClass: "Other" }],
    [null, { errorClass: "Other" }],
  ])("%# → liste blanche", (error, expected) => {
    expect(classifyStoreError(error)).toEqual(expected);
  });
});

describe("guardedStore : diagnostic", () => {
  it("timeout : genre, classe, durée et délai ; aucun message ni argument", async () => {
    const error = await failure(guardedStore({ evalScript: () => new Promise(() => {}) }, 20));
    expect(error.kind).toBe("timeout");
    expect(error.diag).toMatchObject({ storeKind: "timeout", errorClass: "FinanceStoreError", timeoutMs: 20 });
    expect(error.diag!.elapsedMs).toBeGreaterThanOrEqual(19);
    expect(JSON.stringify(error.diag)).not.toContain("argument-secret");
  });

  it("erreur Upstash : le message (qui contient la commande) n'est jamais conservé", async () => {
    const inner: ScriptStore = {
      evalScript: async () => {
        throw Object.assign(new Error("ERR, command was: [\"EVAL\",\"{ch:ai:test}:x\",\"argument-secret\"]"), { name: "UpstashError" });
      },
    };
    const error = await failure(guardedStore(inner));
    expect(error.message).toBe("Redis indisponible");
    expect(error.diag).toMatchObject({ storeKind: "unavailable", errorClass: "UpstashError" });
    expect(JSON.stringify(error.diag)).not.toMatch(/argument-secret|ch:ai|command/);
  });

  it("inactivité mesurée localement entre deux opérations", async () => {
    let calls = 0;
    const store = guardedStore({
      evalScript: async () => {
        calls += 1;
        if (calls === 2) throw new Error("boom");
        return 1;
      },
    });
    await store.evalScript("return 1", [], []);
    await new Promise((r) => setTimeout(r, 30));
    const error = await failure(store);
    expect(error.diag!.idleBeforeMs).toBeGreaterThanOrEqual(25);
  });
});

describe("vrai client Upstash : tentatives HTTP de l'opération", () => {
  let server: Server | undefined;
  afterEach(async () => {
    server?.closeAllConnections();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });
  async function listen(handler: Parameters<typeof createServer>[1]) {
    server = createServer(handler);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  }
  const env = (url: string) => ({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: "jeton-de-test" });

  it("connexion refusée : 2 tentatives (1 relance réseau), classe TypeError, code whitelisté", async () => {
    const url = await listen(() => {});
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    const error = await failure(createUpstashStore(env(url)));
    expect(error.diag).toMatchObject({ storeKind: "unavailable", errorClass: "TypeError", httpAttempts: 2 });
    expect(error.diag!.errorCode).toMatch(/^[A-Z][A-Z0-9_]{2,31}$/);
  });

  it("serveur muet : 1 seule tentative (un abort n'est jamais rejoué), ≤ 1 500 ms + marge", async () => {
    let hits = 0;
    const url = await listen(() => {
      hits += 1;
    });
    const started = Date.now();
    const error = await failure(createUpstashStore(env(url)));
    expect(Date.now() - started).toBeLessThan(1_500 + 400);
    expect(error.diag).toMatchObject({ httpAttempts: 1, timeoutMs: 1_500 });
    expect(["timeout", "unavailable"]).toContain(error.diag!.storeKind);
    expect(hits).toBe(1);
  });

  it("réponse HTTP 500 : 1 tentative, classe UpstashError, aucun message", async () => {
    const url = await listen((_req, res) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "ERR interne argument-secret" }));
    });
    const error = await failure(createUpstashStore(env(url)));
    expect(error.diag).toMatchObject({ storeKind: "unavailable", errorClass: "UpstashError", httpAttempts: 1 });
    expect(JSON.stringify(error.diag)).not.toContain("argument-secret");
  });
});
