import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}


export async function getOptionalUser(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(request: NextRequest) {
  const user = await getOptionalUser(request);
  if (!user) {
    throw new AuthError("Not signed in.", 401);
  }
  return user;
}