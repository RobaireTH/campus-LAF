import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

const globalForDb = globalThis as unknown as { db?: PrismaClient };

function client() {
  const instance = globalForDb.db ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForDb.db = instance;
  return instance;
}

let instance: PrismaClient | undefined;

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    instance ??= client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
