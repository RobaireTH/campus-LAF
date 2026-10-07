import { describe, expect, it } from "vitest";

import { MAX_BODY_BYTES } from "@/lib/http/body";

import { ApiClient } from "./support/client";
import { createSignedInUser, newItemPayload } from "./support/factories";

interface ErrorBody {
  error: string;
}

const EVIL_CALLBACKS = ["/\\evil.example", "//evil.example", "/\t/evil.example", "https://evil.example", "javascript:alert(1)"];

describe("security headers", () => {
  it.each(["/login", "/api/health"])("are set on %s", async (path) => {
    const { headers } = await new ApiClient().get(path);

    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toContain("camera=()");
    expect(headers.get("strict-transport-security")).toContain("max-age=");
    expect(headers.get("x-powered-by")).toBeNull();
  });

  it("include a content security policy that blocks framing, plugins and foreign scripts", async () => {
    const { headers } = await new ApiClient().get("/login");
    const policy = headers.get("content-security-policy") ?? "";
    const directives = Object.fromEntries(policy.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }));

    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives["script-src"]).not.toContain("*");
  });

  it("let the browser reach the storage host for images, media and uploads, and nothing else", async () => {
    const { headers } = await new ApiClient().get("/login");
    const policy = headers.get("content-security-policy") ?? "";
    const storage = "https://[a-z0-9-]+\\.r2\\.cloudflarestorage\\.com";

    for (const directive of ["img-src", "media-src", "connect-src"]) {
      expect(policy).toMatch(new RegExp(`${directive}[^;]*${storage}`));
    }
    expect(policy).not.toMatch(/(?:script|style|font|default)-src[^;]*https?:/);
  });
});

describe("request body limit", () => {
  const oversized = "x".repeat(MAX_BODY_BYTES + 1000);

  it("answers 413 for an oversized public request before looking at it", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/auth/login", { email: "a@e2e.test", password: oversized });

    expect(result.status).toBe(413);
    expect(result.body.error).toBe("The request body is too large.");
  });

  it("answers 413 for an oversized signed-in request", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/items", await newItemPayload({ description: oversized }));

    expect(result.status).toBe(413);
  });

  it("answers 413 for an oversized idempotent request without storing its key", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/items", await newItemPayload({ description: oversized }), {
      headers: { "Idempotency-Key": "oversized-request-key" },
    });

    expect(result.status).toBe(413);
    expect(result.body.error).toBe("The request body is too large.");
  });

  it("still accepts a normal request", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post("/api/items", await newItemPayload());

    expect(result.status).toBe(201);
  });
});

describe("sign-in callback links", () => {
  it.each([
    ["/login", "/register"],
    ["/register", "/login"],
  ])("on %s ignore a callback that leaves the site", async (page, other) => {
    for (const callback of EVIL_CALLBACKS) {
      const result = await new ApiClient().get<string>(`${page}?callbackUrl=${encodeURIComponent(callback)}`);

      expect(result.status).toBe(200);
      expect(result.body).toContain(`href="${other}?callbackUrl=%2F"`);
    }
  });

  it("on /verify-id ignore a callback that leaves the site", async () => {
    for (const callback of EVIL_CALLBACKS) {
      const result = await new ApiClient().get<string>(`/verify-id?callbackUrl=${encodeURIComponent(callback)}`);

      expect(result.status).toBe(200);
      expect(result.body).toMatch(/callbackUrl\\":\\"\/\\"/);
    }
  });

  it("keep a callback that stays on the site", async () => {
    const callback = encodeURIComponent("/items/abc123?tab=claims");

    const result = await new ApiClient().get<string>(`/login?callbackUrl=${callback}`);

    expect(result.status).toBe(200);
    expect(result.body).toContain(`href="/register?callbackUrl=${callback}"`);
  });
});
