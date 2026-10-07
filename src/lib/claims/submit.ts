import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaKind, ownsUpload } from "@/lib/uploads/keys";

import type { ClaimRequest, ClaimResponse } from "./schema";

export type SubmitClaimResult =
  | { ok: true; claim: ClaimResponse }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

const fail = (status: 400 | 403 | 404 | 409, error: string): SubmitClaimResult => ({ ok: false, status, error });

export async function submitClaim(itemId: string, user: CurrentUser, input: ClaimRequest): Promise<SubmitClaimResult> {
  if (!input.mediaKeys.every((key) => ownsUpload(key, user.id, "claim"))) {
    return fail(400, "One or more attached files are not valid claim uploads.");
  }

  const item = await db.item.findUnique({ where: { id: itemId }, select: { posterId: true, status: true } });
  if (!item || item.status === "REMOVED") return fail(404, "Item not found.");
  if (item.posterId === user.id) return fail(403, "You can't claim your own item.");
  if (item.status !== "OPEN") return fail(409, "This item is no longer open for claims.");

  const pending = await db.claim.findFirst({
    where: { itemId, claimantId: user.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return fail(409, "You already have a pending claim on this item.");

  try {
    const claim = await db.claim.create({
      data: {
        itemId,
        claimantId: user.id,
        proofText: input.description,
        media: {
          create: input.mediaKeys.map((key, position) => ({ key, position, type: mediaKind(key)! })),
        },
      },
      select: { id: true, createdAt: true },
    });
    return { ok: true, claim: { id: claim.id, status: "PENDING", createdAt: claim.createdAt.toISOString() } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "You already have a pending claim on this item, or a file was already used.");
    }
    throw error;
  }
}
