import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import {
  buildBaseRequest,
  buildCreateParams,
  classifyError,
  createAnthropicClient,
  createAnthropicProvider,
  parseRetryAfterMs,
  type AnthropicLikeClient,
  type ModelRequest,
  type RequestLikeOptions,
} from "@/lib/ai/provider";

const request: ModelRequest = {
  system: "Prompt système de test",
  messages: [
    { role: "user", text: "Bonjour" },
    { role: "assistant", text: "", calls: [{ id: "toolu_1", name: "search_properties", input: { quartier: "Maarif" } }] },
    { role: "tool", callId: "toolu_1", result: '{"count":0,"properties":[]}' },
  ],
  tools: [{ name: "search_properties", description: "Recherche", inputSchema: { type: "object", properties: {} } }],
  finalTurn: false,
};

function fakeClient() {
  const message = {
    id: "msg_123",
    content: [{ type: "text", text: "Bonjour !" }],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 5 },
    _request_id: "req_abc",
  } as unknown as Anthropic.Message;
  const client = {
    messages: {
      create: vi.fn<(params: unknown, options: RequestLikeOptions) => Promise<Anthropic.Message>>(async () => message),
      countTokens: vi.fn<(params: unknown, options: RequestLikeOptions) => Promise<Anthropic.MessageTokensCount>>(async () => ({
        input_tokens: 4_321,
      })),
    },
  };
  return client as typeof client & AnthropicLikeClient;
}

const options = () => ({ signal: new AbortController().signal, timeoutMs: 45_000 });

describe("client Anthropic", () => {
  it("SDK : maxRetries = 0 (aucun retry implicite)", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-local-uniquement");
    const client = createAnthropicClient();
    expect(client.maxRetries).toBe(0);
    vi.unstubAllEnvs();
  });

  it("seules les options signal et timeout sont transmises (jamais maxRetries)", async () => {
    const client = fakeClient();
    const provider = createAnthropicProvider(client);
    await provider.create(request, options());
    await provider.countTokens(request, options());
    const createOptions = client.messages.create.mock.calls[0][1];
    const countOptions = client.messages.countTokens.mock.calls[0][1];
    expect(Object.keys(createOptions).sort()).toEqual(["signal", "timeout"]);
    expect(Object.keys(countOptions).sort()).toEqual(["signal", "timeout"]);
    expect(createOptions.timeout).toBe(45_000);
  });
});

describe("requête", () => {
  it("modèle verrouillé, max_tokens = 1500, service_tier = standard_only", () => {
    const params = buildCreateParams(request);
    expect(params.model).toBe("claude-opus-5");
    expect(params.max_tokens).toBe(1_500);
    expect(params.service_tier).toBe("standard_only");
  });

  it("aucun paramètre susceptible d'augmenter le prix", () => {
    const params = buildCreateParams(request) as unknown as Record<string, unknown>;
    for (const forbidden of ["speed", "inference_geo", "container", "cache_control", "stream", "thinking"]) {
      expect(params).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(params)).not.toContain('"ttl"');
    expect(JSON.stringify(params)).not.toContain("1h");
  });

  it("comptage et appel partagent exactement la même requête de base", async () => {
    const client = fakeClient();
    const provider = createAnthropicProvider(client);
    await provider.countTokens(request, options());
    await provider.create(request, options());
    const counted = client.messages.countTokens.mock.calls[0][0] as unknown as Record<string, unknown>;
    const created = { ...(client.messages.create.mock.calls[0][0] as unknown as Record<string, unknown>) };
    expect(counted).toEqual(buildBaseRequest(request));
    delete created.max_tokens;
    delete created.service_tier;
    expect(created).toEqual(counted);
  });

  it("tour final : tool_choice none, dans le comptage comme dans l'appel", () => {
    const finalRequest = { ...request, finalTurn: true };
    expect(buildBaseRequest(finalRequest).tool_choice).toEqual({ type: "none" });
    expect(buildCreateParams(finalRequest).tool_choice).toEqual({ type: "none" });
    expect(buildBaseRequest(request).tool_choice).toEqual({ type: "auto" });
  });

  it("succès : texte, usage, response.id et request-id exposés", async () => {
    const provider = createAnthropicProvider(fakeClient());
    expect(await provider.create(request, options())).toEqual({
      kind: "success",
      value: { text: "Bonjour !", calls: [], stopReason: "end_turn", responseId: "msg_123" },
      usage: { input_tokens: 10, output_tokens: 5 },
      anthropicRequestId: "req_abc",
    });
  });
});

describe("classement des erreurs (aucune exception ne sort)", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("429 avec retry-after (secondes)", () => {
    const error = new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", headers({ "retry-after": "3" }));
    expect(classifyError(error)).toMatchObject({ kind: "http_error", status: 429, retryAfterMs: 3_000, spendLimit: false });
  });

  it("429 avec retry-after-ms (prioritaire)", () => {
    const error = new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", headers({ "retry-after-ms": "1500", "retry-after": "9" }));
    expect(classifyError(error)).toMatchObject({ retryAfterMs: 1_500 });
  });

  it("429 sans retry-after", () => {
    const error = new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", headers({}));
    expect(classifyError(error)).toMatchObject({ kind: "http_error", status: 429, retryAfterMs: undefined, spendLimit: false });
  });

  it("plafond de dépense explicite (400 / 402 / message)", () => {
    // Corps d'erreur au format de l'API : le SDK en reprend le message.
    const body = (type: string, message: string) => ({ type: "error", error: { type, message } });
    expect(
      classifyError(new Anthropic.BadRequestError(400, body("invalid_request_error", "You have reached your spend limit"), undefined, headers({})))
    ).toMatchObject({ spendLimit: true });
    expect(classifyError(new Anthropic.APIError(402, body("billing_error", "billing"), undefined, headers({})))).toMatchObject({ spendLimit: true });
    expect(
      classifyError(new Anthropic.BadRequestError(400, body("invalid_request_error", "Your credit balance is too low"), undefined, headers({})))
    ).toMatchObject({ spendLimit: true });
    expect(
      classifyError(new Anthropic.BadRequestError(400, body("invalid_request_error", "messages: invalid"), undefined, headers({})))
    ).toMatchObject({ spendLimit: false });
  });

  it("500 et 529", () => {
    expect(classifyError(new Anthropic.InternalServerError(500, {}, "boom", headers({})))).toMatchObject({ kind: "http_error", status: 500 });
    expect(classifyError(new Anthropic.InternalServerError(529, {}, "overloaded", headers({})))).toMatchObject({ kind: "http_error", status: 529 });
  });

  it("abort, timeout, réseau, exception inconnue", () => {
    expect(classifyError(new Anthropic.APIUserAbortError())).toEqual({ kind: "interrupted", cause: "aborted" });
    expect(classifyError(new Anthropic.APIConnectionTimeoutError())).toEqual({ kind: "interrupted", cause: "timeout" });
    expect(classifyError(new Anthropic.APIConnectionError({ message: "down" }))).toEqual({ kind: "interrupted", cause: "network" });
    expect(classifyError(new Error("?"))).toEqual({ kind: "interrupted", cause: "exception" });
  });

  it("create capture les erreurs du SDK", async () => {
    const client = fakeClient();
    client.messages.create.mockRejectedValueOnce(new Anthropic.APIConnectionTimeoutError());
    const provider = createAnthropicProvider(client);
    expect(await provider.create(request, options())).toEqual({ kind: "interrupted", cause: "timeout" });
  });

  it("retry-after sous forme de date HTTP", () => {
    const now = Date.UTC(2026, 8, 17, 10, 0, 0);
    expect(parseRetryAfterMs(headers({ "retry-after": new Date(now + 4_000).toUTCString() }), now)).toBe(4_000);
    expect(parseRetryAfterMs(headers({ "retry-after": "n'importe quoi" }), now)).toBeUndefined();
  });
});
