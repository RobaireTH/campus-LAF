import { randomInt, randomUUID } from "node:crypto";

import type { KycStatus, Role } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { ApiClient } from "./client";

export const TEST_PASSWORD = "correct-horse-battery";

interface UserOverrides {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  kycStatus?: KycStatus;
}

let passwordHash: Promise<string> | undefined;

function testPasswordHash() {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  return passwordHash;
}

export const uniqueEmail = (tag = "user") => `${tag}-${randomUUID().slice(0, 8)}@e2e.test`;

export const uniqueLocalPhone = () => `080${randomInt(10_000_000, 100_000_000)}`;

export const toInternational = (localPhone: string) => `+234${localPhone.slice(1)}`;

export async function createUser(overrides: UserOverrides = {}) {
  return db.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? uniqueEmail(),
      phone: overrides.phone ?? toInternational(uniqueLocalPhone()),
      password: await testPasswordHash(),
      role: overrides.role ?? "STUDENT",
      kycStatus: overrides.kycStatus ?? "NOT_SUBMITTED",
    },
  });
}

export async function signInAs(user: { id: string }) {
  const client = new ApiClient();
  const session = await createSession(user.id);
  client.cookies.set(SESSION_COOKIE, session.token);
  return client;
}

export async function createSignedInUser(overrides: UserOverrides = {}) {
  const user = await createUser(overrides);
  return { user, client: await signInAs(user) };
}
