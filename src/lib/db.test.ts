import { describe, expect, it } from "vitest";

import { connectionConfig, qualifiedTable } from "./db";

describe("connectionConfig", () => {
  it("takes the schema out of the connection string", () => {
    const config = connectionConfig("postgresql://user:secret@db.example.com/app?schema=e2e&sslmode=verify-full");

    expect(config.schema).toBe("e2e");
    expect(config.connectionString).not.toContain("schema=");
    expect(config.connectionString).toContain("sslmode=verify-full");
  });

  it("has no schema when the url names none", () => {
    expect(connectionConfig("postgresql://user:secret@db.example.com/app").schema).toBeUndefined();
  });

  it.each(["prefer", "require", "verify-ca"])("raises the legacy ssl mode %s to verify-full", (mode) => {
    const config = connectionConfig(`postgresql://user:secret@db.example.com/app?sslmode=${mode}`);

    expect(new URL(config.connectionString).searchParams.get("sslmode")).toBe("verify-full");
  });
});

describe("qualifiedTable", () => {
  it("prefixes the schema from the connection url", () => {
    expect(qualifiedTable("RateLimit", "postgresql://user:secret@db.example.com/app?schema=e2e").sql).toBe(
      '"e2e"."RateLimit"',
    );
  });

  it("uses the bare table name when there is no schema", () => {
    expect(qualifiedTable("RateLimit", "postgresql://user:secret@db.example.com/app").sql).toBe('"RateLimit"');
    expect(qualifiedTable("RateLimit", "").sql).toBe('"RateLimit"');
  });

  it("refuses a schema that is not a plain name", () => {
    const url = `postgresql://user:secret@db.example.com/app?schema=${encodeURIComponent('e2e"; drop table "User')}`;

    expect(() => qualifiedTable("RateLimit", url)).toThrow("not a valid name");
  });
});
