export const E2E_PORT = 3101;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export const DEFAULT_CATEGORY = "Default category";
export const DEFAULT_LOCATION = "Default place";

export const STORAGE_VARIABLES = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

const STORAGE_PLACEHOLDERS = {
  R2_ACCOUNT_ID: "e2e-account",
  R2_ACCESS_KEY_ID: "e2e-access-key",
  R2_SECRET_ACCESS_KEY: "e2e-secret-key",
  R2_BUCKET: "e2e-bucket",
  E2E_R2_PLACEHOLDER: "1",
};

const DEFAULT_SCHEMA = "e2e";
const SCHEMA_PATTERN = /^[a-z][a-z0-9_]*$/;

const target = (url) => `${url.host}${url.pathname}#${url.searchParams.get("schema") ?? "public"}`;

export function e2eDatabaseUrl() {
  const explicit = process.env.E2E_DATABASE_URL || undefined;
  const source = explicit ?? process.env.DATABASE_URL;
  if (!source) throw new Error("Set DATABASE_URL, or E2E_DATABASE_URL, before running the end-to-end tests.");

  const url = new URL(source);
  if (!explicit || !url.searchParams.has("schema")) url.searchParams.set("schema", DEFAULT_SCHEMA);

  const schema = url.searchParams.get("schema");
  const development = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
  const collidesWithDevelopment = development !== undefined && target(development) === target(url);
  if (schema === "public" || !SCHEMA_PATTERN.test(schema) || collidesWithDevelopment) {
    throw new Error(
      "Refusing to run end-to-end tests here: they reset their schema on every run. Point E2E_DATABASE_URL at a dedicated database or schema.",
    );
  }
  return url.toString();
}

export function storageEnv() {
  const configured = STORAGE_VARIABLES.every((name) => Boolean(process.env[name])) && !process.env.E2E_SKIP_R2;
  return configured ? {} : STORAGE_PLACEHOLDERS;
}
