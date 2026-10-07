import { afterEach, describe, expect, it, vi } from "vitest";

import { badRequest, tooManyRequests } from "./errors";
import { route } from "./route";

const post = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/example", { method: "POST", headers: { host: "localhost:3000", ...headers } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route", () => {
  it("returns the handler response and defaults it to no-store", async () => {
    const response = await route(() => Response.json({ ok: true }))(post(), undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps a Cache-Control header the handler set", async () => {
    const response = await route(() => Response.json({}, { headers: { "Cache-Control": "public, max-age=60" } }))(
      post(),
      undefined,
    );

    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("turns an ApiError into its status, message and field errors", async () => {
    const response = await route(() => {
      throw badRequest("Invalid input.", { email: ["Enter a valid email address."] });
    })(post(), undefined);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid input.", fields: { email: ["Enter a valid email address."] } });
  });

  it("passes error headers through", async () => {
    const response = await route(() => {
      throw tooManyRequests(42);
    })(post(), undefined);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("hides unexpected errors behind a generic 500 and logs them without secrets", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await route(() => {
      throw new Error("password=hunter2 leaked in a stack trace");
    })(post(), undefined);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Something went wrong. Try again." });
    expect(logged.mock.calls[0][0]).toBe("Unhandled API error (POST /api/example)");
    expect(JSON.stringify(logged.mock.calls)).not.toContain("hunter2");
  });

  it("reports an unreachable database as 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await route(() => {
      throw Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    })(post(), undefined);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Database unavailable" });
  });

  it("blocks a cross-origin write before the handler runs", async () => {
    const handler = vi.fn(() => Response.json({ ok: true }));

    const response = await route(handler)(post({ origin: "https://evil.example" }), undefined);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
