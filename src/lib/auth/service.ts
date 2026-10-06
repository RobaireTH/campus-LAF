import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { conflict, unauthorized, type FieldErrors } from "@/lib/http/errors";

import { hashPassword, verifyPassword } from "./password";
import type { RegisterInput } from "./schema";
import { sessionUserSelect, toSessionUser } from "./session";

let dummyHash: Promise<string> | undefined;

function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

async function duplicateFields(input: RegisterInput) {
  const existing = await db.user.findMany({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { email: true, phone: true },
  });
  const fields: FieldErrors = {};
  if (existing.some((user) => user.email === input.email)) {
    fields.email = ["An account with this email already exists."];
  }
  if (existing.some((user) => user.phone === input.phone)) {
    fields.phone = ["An account with this phone number already exists."];
  }
  return fields;
}

export async function registerUser(input: RegisterInput) {
  const password = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: { name: input.name, email: input.email, phone: input.phone, password },
      select: sessionUserSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fields = await duplicateFields(input);
      throw conflict(Object.values(fields)[0]?.[0] ?? "These details are already registered.", fields);
    }
    throw error;
  }
}

export async function authenticate(email: string, password: string) {
  const record = await db.user.findUnique({
    where: { email },
    select: { ...sessionUserSelect, password: true },
  });
  const valid = await verifyPassword(password, record?.password ?? (await getDummyHash()));
  if (!record || !valid) throw unauthorized("Email or password is incorrect.");
  return toSessionUser(record);
}
