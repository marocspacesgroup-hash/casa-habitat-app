import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/tools", async () => {
  const { TOOL_DEFINITIONS_STUB } = await import("./helpers");
  return { TOOL_DEFINITIONS: TOOL_DEFINITIONS_STUB, searchProperties: vi.fn(), getPropertyDetails: vi.fn(), requestHumanContact: vi.fn() };
});

describe("route /api/chat", () => {
  it("adaptateur mince : POST uniquement (405 pour les autres méthodes), nodejs, dynamique, maxDuration 300", async () => {
    const route = await import("@/app/api/chat/route");
    expect(Object.keys(route).sort()).toEqual(["POST", "dynamic", "maxDuration", "runtime"]);
    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
    expect(route.maxDuration).toBe(300);
  });

  it("aucun appel direct au modèle hors provider.ts", () => {
    for (const file of ["src/app/api/chat/route.ts", "src/lib/ai/agent.ts", "src/lib/ai/chat-handler.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/messages\.create|\.run\(|new Anthropic|getProvider\(\)\.run/);
    }
  });

  it("le limiteur en mémoire n'existe plus", () => {
    expect(() => readFileSync("src/lib/ai/rate-limit.ts", "utf8")).toThrow();
  });
});
