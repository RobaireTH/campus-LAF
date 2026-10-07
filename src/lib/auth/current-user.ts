import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { forbidden, unauthorized } from "@/lib/http/errors";

import { SESSION_COOKIE, findSessionUser, type SessionUser } from "./session";

export type CurrentUser = SessionUser;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? findSessionUser(token) : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export function assertVerified(user: CurrentUser) {
  if (user.kycStatus !== "VERIFIED") throw forbidden("Verify your student ID to do this.");
  return user;
}

export async function requireVerified() {
  return assertVerified(await requireUser());
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw forbidden("Administrator access is required.");
  return user;
}
