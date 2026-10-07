import dns from "node:dns";
import net from "node:net";

import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/generated/prisma/client";

net.setDefaultAutoSelectFamily(false);
dns.setDefaultResultOrder("ipv4first");

const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);
const SCHEMA_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function connectionConfig(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  if (LEGACY_SSL_MODES.has(url.searchParams.get("sslmode") ?? "")) url.searchParams.set("sslmode", "verify-full");
  return { connectionString: url.toString(), schema };
}

export function qualifiedTable(table: string, connectionUrl = process.env.DATABASE_URL) {
  const schema = connectionUrl ? connectionConfig(connectionUrl).schema : undefined;
  if (schema !== undefined && !SCHEMA_NAME.test(schema)) throw new Error("The schema in DATABASE_URL is not a valid name");
  return Prisma.raw(schema ? `"${schema}"."${table}"` : `"${table}"`);
}

export function createDbClient(connectionUrl: string) {
  const { connectionString, schema } = connectionConfig(connectionUrl);
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 10_000 }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}

export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

const globalForDb = globalThis as unknown as { db?: PrismaClient };

function client() {
  if (!globalForDb.db) {
    const connectionUrl = process.env.DATABASE_URL;
    if (!connectionUrl) throw new Error("DATABASE_URL is not set");
    globalForDb.db = createDbClient(connectionUrl);
  }
  return globalForDb.db;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
