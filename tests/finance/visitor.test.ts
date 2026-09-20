import { describe, expect, it } from "vitest";
import {
  UNKNOWN_VISITOR,
  hashVisitorIdentity,
  networkIdentityFromRequest,
  normalizeVisitorAddress,
  visitorHmacSecret,
  visitorKeyFromRequest,
  visitorLogId,
} from "@/lib/ai/finance/visitor";
import { TEST_HMAC_SECRET } from "./helpers";

function request(headers: Record<string, string>, body?: string) {
  return new Request("https://www.casahabitatmaroc.com/api/chat", { method: "POST", headers, body });
}

describe("normalisation de l'identité réseau", () => {
  it("IPv4 : adresse complète", () => {
    expect(normalizeVisitorAddress("203.0.113.7")).toBe("v4:203.0.113.7");
    expect(normalizeVisitorAddress("203.0.113.7:51234")).toBe("v4:203.0.113.7");
  });

  it("IPv6 : même /64 pour deux adresses du même bloc, différent sinon", () => {
    const a = normalizeVisitorAddress("2001:db8:abcd:12::1");
    expect(a).toBe("v6:2001:0db8:abcd:0012::/64");
    expect(normalizeVisitorAddress("2001:0db8:abcd:0012:ffff:eeee:dddd:cccc")).toBe(a);
    expect(normalizeVisitorAddress("2001:db8:abcd:13::1")).not.toBe(a);
  });

  it("IPv6 : formes compressées, crochets et zone ; IPv4 encapsulée → IPv4", () => {
    expect(normalizeVisitorAddress("::1")).toBe("v6:0000:0000:0000:0000::/64");
    expect(normalizeVisitorAddress("[2001:db8::1]:443")).toBe("v6:2001:0db8:0000:0000::/64");
    expect(normalizeVisitorAddress("fe80::1%eth0")).toBe("v6:fe80:0000:0000:0000::/64");
    expect(normalizeVisitorAddress("::ffff:198.51.100.4")).toBe("v4:198.51.100.4");
  });

  it("adresse absente ou invalide : compartiment partagé", () => {
    for (const bad of [undefined, "", "pas-une-ip", "999.1.1.1", "1:2:3"]) {
      expect(normalizeVisitorAddress(bad)).toBe(UNKNOWN_VISITOR);
    }
  });

  it("lit la première entrée de x-forwarded-for, puis x-real-ip, jamais le corps", () => {
    expect(networkIdentityFromRequest(request({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe("v4:198.51.100.4");
    expect(networkIdentityFromRequest(request({ "x-real-ip": "198.51.100.9" }))).toBe("v4:198.51.100.9");
    expect(networkIdentityFromRequest(request({}))).toBe(UNKNOWN_VISITOR);
    const withBody = request(
      { "x-forwarded-for": "198.51.100.4" },
      JSON.stringify({ visitor_id: "v4:1.2.3.4", visitor: "admin", budget: 999 })
    );
    expect(networkIdentityFromRequest(withBody)).toBe("v4:198.51.100.4");
  });
});

describe("clé visiteur HMAC (D4)", () => {
  it("HMAC-SHA256 hexadécimal de 64 caractères, sans IP", () => {
    const key = visitorKeyFromRequest(request({ "x-forwarded-for": "198.51.100.4" }), TEST_HMAC_SECRET);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("198");
    expect(key).toBe(hashVisitorIdentity("v4:198.51.100.4", TEST_HMAC_SECRET));
  });

  it("même /64 IPv6 → même clé ; secret différent → clé différente", () => {
    const a = visitorKeyFromRequest(request({ "x-forwarded-for": "2001:db8:abcd:12::1" }), TEST_HMAC_SECRET);
    const b = visitorKeyFromRequest(request({ "x-forwarded-for": "2001:db8:abcd:12::ffff" }), TEST_HMAC_SECRET);
    expect(a).toBe(b);
    expect(visitorKeyFromRequest(request({ "x-forwarded-for": "2001:db8:abcd:12::1" }), `${TEST_HMAC_SECRET}-autre`)).not.toBe(a);
  });

  it("forme journalisée tronquée à 12 caractères", () => {
    expect(visitorLogId("a".repeat(64))).toBe("aaaaaaaaaaaa");
  });

  it("secret absent ou trop court → null (fail-closed)", () => {
    expect(visitorHmacSecret({})).toBeNull();
    expect(visitorHmacSecret({ AI_VISITOR_HMAC_SECRET: "court" })).toBeNull();
    expect(visitorHmacSecret({ AI_VISITOR_HMAC_SECRET: TEST_HMAC_SECRET })).toBe(TEST_HMAC_SECRET);
  });
});
