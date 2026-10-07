import { randomInt, randomUUID } from "node:crypto";

import type { KycStatus, Prisma, Role } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { ApiClient } from "./client";

export const TEST_PASSWORD = "correct-horse-battery";

interface UserOverrides {
  name?: string | null;
  email?: string;
  phone?: string;
  role?: Role;
  kycStatus?: KycStatus;
}

let passwordHash: Promise<string> | undefined;
let taxonomy: Promise<{ categoryId: string; locationId: string }> | undefined;

function testPasswordHash() {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  return passwordHash;
}

export function defaultTaxonomy() {
  taxonomy ??= Promise.all([db.category.findFirstOrThrow(), db.location.findFirstOrThrow()]).then(
    ([category, location]) => ({ categoryId: category.id, locationId: location.id }),
  );
  return taxonomy;
}

export const uniqueEmail = (tag = "user") => `${tag}-${randomUUID().slice(0, 8)}@e2e.test`;

export const uniqueLocalPhone = () => `080${randomInt(10_000_000, 100_000_000)}`;

export const toInternational = (localPhone: string) => `+234${localPhone.slice(1)}`;

export async function createUser(overrides: UserOverrides = {}) {
  return db.user.create({
    data: {
      name: overrides.name === undefined ? "Test User" : overrides.name,
      email: overrides.email ?? uniqueEmail(),
      phone: overrides.phone ?? toInternational(uniqueLocalPhone()),
      password: await testPasswordHash(),
      role: overrides.role ?? "STUDENT",
      kycStatus: overrides.kycStatus ?? "NOT_SUBMITTED",
    },
  });
}

export async function signInAs(user: { id: string }, options: { ip?: string } = {}) {
  const client = new ApiClient(options);
  const session = await createSession(user.id);
  client.cookies.set(SESSION_COOKIE, session.token);
  return client;
}

export async function createSignedInUser(overrides: UserOverrides = {}) {
  const user = await createUser(overrides);
  return { user, client: await signInAs(user) };
}

export async function createItem(
  posterId: string,
  overrides: Partial<Prisma.ItemUncheckedCreateInput> = {},
) {
  const { categoryId, locationId } = await defaultTaxonomy();
  return db.item.create({
    data: {
      type: "LOST",
      title: "Seeded umbrella",
      description: "Created directly in the database.",
      eventDate: new Date(),
      categoryId,
      locationId,
      posterId,
      ...overrides,
    },
  });
}

export async function createScope() {
  const tag = randomUUID().slice(0, 8);
  const [category, location] = await Promise.all([
    db.category.create({ data: { name: `Category ${tag}` } }),
    db.location.create({ data: { name: `Place ${tag}` } }),
  ]);
  return { category, location };
}

export function createClaim(
  itemId: string,
  claimantId: string,
  overrides: Partial<Prisma.ClaimUncheckedCreateInput> = {},
) {
  return db.claim.create({
    data: { itemId, claimantId, proofText: "My initials are stitched inside the lining.", ...overrides },
  });
}

export async function newItemPayload(overrides: Record<string, unknown> = {}) {
  const { categoryId, locationId } = await defaultTaxonomy();
  return {
    type: "FOUND",
    title: "Grey flask",
    description: "Found on the library steps.",
    categoryId,
    locationId,
    dateLostOrFound: new Date().toISOString(),
    ...overrides,
  };
}
