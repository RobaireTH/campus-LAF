import { describe, expect, it } from "vitest";

import { ApiClient } from "./support/client";
import { createSignedInUser } from "./support/factories";

describe("GET /api/health", () => {
  it("reports the app and its database as up, to anyone, without caching", async () => {
    const result = await new ApiClient().get<Record<string, unknown>>("/api/health");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: "ok", database: "up" });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("works for a signed-in user and leaks nothing about the environment", async () => {
    const { client } = await createSignedInUser();

    const result = await client.get<Record<string, unknown>>("/api/health");
    const text = JSON.stringify(result.body);

    for (const secret of [process.env.DATABASE_URL, process.env.R2_SECRET_ACCESS_KEY, process.env.R2_ACCESS_KEY_ID]) {
      if (secret) expect(text).not.toContain(secret);
    }
    expect(Object.keys(result.body).sort()).toEqual(["database", "status"]);
  });
});
