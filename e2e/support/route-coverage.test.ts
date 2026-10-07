import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appDir = path.join(process.cwd(), "src/app");
const e2eDir = path.join(process.cwd(), "e2e");
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

function endpoints() {
  return filesUnder(path.join(appDir, "api"))
    .filter((file) => path.basename(file) === "route.ts")
    .flatMap((file) => {
      const url = `/${path.relative(appDir, path.dirname(file)).split(path.sep).join("/")}`;
      const source = readFileSync(file, "utf8");
      return METHODS.filter((method) => new RegExp(`export (?:const|async function|function) ${method}\\b`).test(source)).map(
        (method) => ({ method, url }),
      );
    });
}

function callPattern({ method, url }: { method: string; url: string }) {
  const segments = url
    .split("/")
    .filter(Boolean)
    .map((segment) => (/^\[.+\]$/.test(segment) ? "(?:\\$\\{[^}]+\\}|[^/`\"'?\\s]+)" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  return new RegExp(`\\.${method.toLowerCase()}\\b[^(]*\\(\\s*[\`"']/${segments.join("/")}[\`"'?]`);
}

const specs = readdirSync(e2eDir)
  .filter((name) => name.endsWith(".e2e.ts"))
  .map((name) => readFileSync(path.join(e2eDir, name), "utf8"));

describe("callPattern", () => {
  const claims = callPattern({ method: "GET", url: "/api/items/[id]/claims" });

  it.each([
    "client.get(`/api/items/${item.id}/claims`)",
    "client.get<ListBody>(`/api/items/${item.id}/claims?limit=2`)",
    'client.get("/api/items/does-not-exist/claims")',
    "client\n    .get<Body>(\n      `/api/items/${id}/claims`",
  ])("matches %s", (call) => {
    expect(claims.test(call)).toBe(true);
  });

  it.each([
    ["another method", "client.post(`/api/items/${item.id}/claims`)"],
    ["a longer path", "client.get(`/api/items/${item.id}/claims/extra`)"],
    ["a shorter path", "client.get(`/api/items/${item.id}`)"],
    ["another path", "client.get(`/api/items/${item.id}/reports`)"],
  ])("does not match %s", (_label, call) => {
    expect(claims.test(call)).toBe(false);
  });

  it("does not match a route nobody calls", () => {
    const missing = callPattern({ method: "DELETE", url: "/api/does-not-exist/[id]" });

    expect(specs.some((spec) => missing.test(spec))).toBe(false);
  });
});

describe("end-to-end coverage", () => {
  it("finds the API routes", () => {
    expect(endpoints().length).toBeGreaterThanOrEqual(26);
  });

  it.each(endpoints().map((endpoint) => [`${endpoint.method} ${endpoint.url}`, endpoint] as const))(
    "has an end-to-end test that calls %s",
    (_label, endpoint) => {
      const pattern = callPattern(endpoint);

      expect(specs.some((spec) => pattern.test(spec))).toBe(true);
    },
  );
});
