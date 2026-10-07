import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_VARIABLES, e2eDatabaseUrl, storageEnv } from "./env.mjs";

const DEV = "postgresql://owner:secret@dev.example.com/app?sslmode=require";

function configure(env: { dev?: string; e2e?: string }) {
  vi.stubEnv("DATABASE_URL", env.dev ?? "");
  vi.stubEnv("E2E_DATABASE_URL", env.e2e ?? "");
}

const schemaOf = (url: string) => new URL(url).searchParams.get("schema");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("e2eDatabaseUrl", () => {
  it("runs inside an e2e schema of the development database by default", () => {
    configure({ dev: DEV });

    const url = new URL(e2eDatabaseUrl());

    expect(url.host).toBe("dev.example.com");
    expect(schemaOf(url.toString())).toBe("e2e");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("never reuses a schema named on the development URL", () => {
    configure({ dev: `${DEV}&schema=dev` });

    expect(schemaOf(e2eDatabaseUrl())).toBe("e2e");
  });

  it("uses another database as given and adds the e2e schema when none is named", () => {
    configure({ dev: DEV, e2e: "postgresql://owner:secret@branch.example.com/app" });

    const url = new URL(e2eDatabaseUrl());

    expect(url.host).toBe("branch.example.com");
    expect(schemaOf(url.toString())).toBe("e2e");
  });

  it("respects a custom non-public schema on the explicit URL", () => {
    configure({ dev: DEV, e2e: "postgresql://owner:secret@branch.example.com/app?schema=ci_run_7" });

    expect(schemaOf(e2eDatabaseUrl())).toBe("ci_run_7");
  });

  it.each([
    ["the public schema", "postgresql://owner:secret@branch.example.com/app?schema=public"],
    ["a schema name that is not a plain identifier", "postgresql://owner:secret@branch.example.com/app?schema=Bad-Name"],
    ["the same database and schema as development", "postgresql://owner:secret@dev.example.com/app?schema=e2e"],
  ])("refuses %s", (_label, explicit) => {
    configure({ dev: "postgresql://owner:secret@dev.example.com/app?schema=e2e", e2e: explicit });

    expect(() => e2eDatabaseUrl()).toThrow(/Refusing/);
  });

  it("refuses to guess when no database is configured", () => {
    configure({});

    expect(() => e2eDatabaseUrl()).toThrow(/Set DATABASE_URL/);
  });
});

describe("storageEnv", () => {
  const stubStorage = (skip = "") => {
    for (const name of STORAGE_VARIABLES) vi.stubEnv(name, `real-${name}`);
    vi.stubEnv("E2E_SKIP_R2", skip);
  };

  it("keeps real storage credentials and always clears a local storage endpoint", () => {
    stubStorage();

    expect(storageEnv()).toEqual({ R2_ENDPOINT: "" });
  });

  it.each(STORAGE_VARIABLES)("falls back to offline placeholders when %s is missing", (missing) => {
    stubStorage();
    vi.stubEnv(missing, "");

    expect(storageEnv()).toMatchObject({ R2_ACCOUNT_ID: "e2e-account", R2_BUCKET: "e2e-bucket", E2E_R2_PLACEHOLDER: "1" });
  });

  it("uses placeholders even with real credentials when asked to skip the storage round trip", () => {
    stubStorage("1");

    expect(storageEnv()).toMatchObject({ R2_ACCESS_KEY_ID: "e2e-access-key", E2E_R2_PLACEHOLDER: "1" });
  });
});
