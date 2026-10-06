import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isSecureRequest } from "@/lib/http/request";

export const SESSION_COOKIE = "findr_session";
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

export const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  kycStatus: true,
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

interface SessionTicket {
  token: string;
  expiresAt: Date;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function toSessionUser(user: SessionUser): SessionUser {
  const { id, name, email, phone, image, role, kycStatus } = user;
  return { id, name, email, phone, image, role, kycStatus };
}

export async function createSession(userId: string): Promise<SessionTicket> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.session.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  return { token, expiresAt };
}

export async function revokeSession(token: string) {
  await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, expiresAt: true, user: { select: sessionUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

function serializeCookie(value: string, maxAge: number, expires: Date, secure: boolean) {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Expires=${expires.toUTCString()}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function withSessionCookie(response: Response, request: Request, session: SessionTicket) {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(session.token, SESSION_TTL_SECONDS, session.expiresAt, isSecureRequest(request)),
  );
  return response;
}

export function withClearedSessionCookie(response: Response, request: Request) {
  response.headers.append("Set-Cookie", serializeCookie("", 0, new Date(0), isSecureRequest(request)));
  return response;
}
