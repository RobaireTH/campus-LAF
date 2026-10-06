import { describe, expect, it } from "vitest";

import { ApiError } from "./errors";
import { assertSameOrigin } from "./origin";

const request = (method: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/example", { method, headers: { host: "localhost:3000", ...headers } });

describe("assertSameOrigin", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("never blocks %s", (method) => {
    expect(() => assertSameOrigin(request(method, { origin: "https://evil.example" }))).not.toThrow();
  });

  it("allows a state-changing request from the same origin", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "http://localhost:3000" }))).not.toThrow();
  });

  it("allows a state-changing request that sends no Origin", () => {
    expect(() => assertSameOrigin(request("POST"))).not.toThrow();
  });

  it.each([
    ["a different site", "https://evil.example"],
    ["the same host on another port", "http://localhost:4000"],
    ["an opaque origin", "null"],
    ["an unparseable origin", "not a url"],
  ])("blocks a state-changing request from %s", (_label, origin) => {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      expect(() => assertSameOrigin(request(method, { origin }))).toThrow(ApiError);
    }
  });

  it("compares against the forwarded host behind a proxy", () => {
    const behindProxy = request("POST", { origin: "https://findr.example", "x-forwarded-host": "findr.example" });

    expect(() => assertSameOrigin(behindProxy)).not.toThrow();
  });
});
