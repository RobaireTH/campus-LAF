import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { TRANSACTION_OPTIONS, db } from "@/lib/db";
import { conflict, forbidden, notFound } from "@/lib/http/errors";
import { transitionItem } from "@/lib/items/status";
import { getMediaUrl } from "@/lib/uploads/media";

import { generateHandoverCode } from "./code";
import { whatsappUrl } from "./contact";
import type { ClaimDecision, HandoverAction } from "./schema";

class LostRace extends Error {}

type HandoverStatus = "APPROVED" | "RESOLVED" | "CANCELLED";

const handoverSelect = {
  id: true,
  status: true,
  itemId: true,
  claimantId: true,
  handoverCode: true,
  claimant: { select: { name: true, phone: true } },
  item: {
    select: { id: true, title: true, status: true, posterId: true, poster: { select: { name: true, phone: true } } },
  },
} satisfies Prisma.ClaimSelect;

type HandoverClaim = Prisma.ClaimGetPayload<{ select: typeof handoverSelect }>;

const NOT_APPROVED = "Contact details are shared once the poster approves a claim.";

function decisionOf(claimId: string) {
  return db.claim.findUniqueOrThrow({ where: { id: claimId }, select: { id: true, status: true, decidedAt: true } });
}

async function rejectClaim(claimId: string) {
  const rejected = await db.claim.updateMany({
    where: { id: claimId, status: "PENDING" },
    data: { status: "REJECTED", decidedAt: new Date() },
  });
  const current = await decisionOf(claimId);
  if (rejected.count === 1 || current.status === "REJECTED") return current;
  throw conflict(`This claim was already ${current.status.toLowerCase()}.`);
}

async function approveClaim(user: CurrentUser, claim: { id: string; itemId: string }) {
  const decidedAt = new Date();
  try {
    await db.$transaction(async (tx) => {
      const claimed = await transitionItem(tx, { itemId: claim.itemId, from: "OPEN", to: "CLAIMED", posterId: user.id });
      if (!claimed) throw new LostRace();
      const approved = await tx.claim.updateMany({
        where: { id: claim.id, status: "PENDING" },
        data: { status: "APPROVED", decidedAt, handoverCode: generateHandoverCode() },
      });
      if (approved.count !== 1) throw new LostRace();
      await tx.claim.updateMany({
        where: { itemId: claim.itemId, status: "PENDING", id: { not: claim.id } },
        data: { status: "REJECTED", decidedAt },
      });
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (!(error instanceof LostRace)) throw error;
    const current = await decisionOf(claim.id);
    if (current.status === "APPROVED") return current;
    throw conflict(
      current.status === "PENDING"
        ? "This item is no longer open for claims."
        : `This claim was already ${current.status.toLowerCase()}.`,
    );
  }
  return { id: claim.id, status: "APPROVED" as const, decidedAt };
}

export async function decideClaim(user: CurrentUser, claimId: string, decision: ClaimDecision) {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    select: { id: true, itemId: true, item: { select: { posterId: true } } },
  });
  if (!claim) throw notFound("Claim not found");
  if (claim.item.posterId !== user.id) throw forbidden("Only the poster can decide on claims.");
  return decision === "APPROVE" ? approveClaim(user, claim) : rejectClaim(claim.id);
}

export async function listItemClaims(user: CurrentUser, itemId: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, select: { posterId: true } });
  if (!item) throw notFound("Item not found");
  if (item.posterId !== user.id) throw forbidden("Only the poster can review claims.");

  const rows = await db.claim.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      proofText: true,
      createdAt: true,
      claimant: { select: { name: true, kycStatus: true } },
      media: { orderBy: { position: "asc" }, select: { id: true, key: true, type: true } },
    },
  });
  const claims = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      status: row.status,
      description: row.proofText,
      createdAt: row.createdAt.toISOString(),
      claimant: { name: row.claimant.name ?? "Anonymous", verified: row.claimant.kycStatus === "VERIFIED" },
      media: await Promise.all(
        row.media.map(async (file) => ({ id: file.id, url: await getMediaUrl(file.key), type: file.type })),
      ),
    })),
  );
  return claims.sort((a, b) => Number(a.status !== "PENDING") - Number(b.status !== "PENDING"));
}

export async function listMyClaims(user: CurrentUser) {
  const rows = await db.claim.findMany({
    where: { claimantId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, status: true, createdAt: true, item: { select: { id: true, title: true, type: true, status: true } } },
  });
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

function handoverStatusOf(claim: HandoverClaim): HandoverStatus | null {
  if (claim.status === "CANCELLED") return "CANCELLED";
  if (claim.status !== "APPROVED") return null;
  if (claim.item.status === "RESOLVED") return "RESOLVED";
  if (claim.item.status === "REMOVED") return "CANCELLED";
  return "APPROVED";
}

async function loadHandoverClaim(user: CurrentUser, claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId }, select: handoverSelect });
  if (!claim) throw notFound("Handover not found");
  if (claim.claimantId !== user.id && claim.item.posterId !== user.id) {
    throw forbidden("Only the poster and the approved claimant can open this handover.");
  }
  return claim;
}

function toHandover(claim: HandoverClaim, user: CurrentUser, status: HandoverStatus) {
  const active = status === "APPROVED";
  const viewerIsPoster = claim.item.posterId === user.id;
  const other = viewerIsPoster ? claim.claimant : claim.item.poster;
  return {
    claimId: claim.id,
    status,
    item: { id: claim.item.id, title: claim.item.title },
    contact: active
      ? {
          name: other.name ?? "Anonymous",
          role: viewerIsPoster ? ("CLAIMANT" as const) : ("POSTER" as const),
          phone: other.phone ?? undefined,
          whatsappUrl: other.phone ? whatsappUrl(other.phone) : undefined,
        }
      : null,
    code: active ? claim.handoverCode : null,
    canComplete: active,
    canCancel: active,
  };
}

async function resolveHandover(claim: HandoverClaim) {
  if (await transitionItem(db, { itemId: claim.itemId, from: "CLAIMED", to: "RESOLVED" })) return;
  const status = handoverStatusOf(await db.claim.findUniqueOrThrow({ where: { id: claim.id }, select: handoverSelect }));
  if (status === "RESOLVED") return;
  throw conflict(status === "CANCELLED" ? "This handover was cancelled." : "This handover can no longer be completed.");
}

async function cancelHandover(claim: HandoverClaim) {
  try {
    await db.$transaction(async (tx) => {
      const cancelled = await tx.claim.updateMany({
        where: { id: claim.id, status: "APPROVED" },
        data: { status: "CANCELLED", decidedAt: new Date() },
      });
      if (cancelled.count !== 1) throw new LostRace();
      if (!(await transitionItem(tx, { itemId: claim.itemId, from: "CLAIMED", to: "OPEN" }))) throw new LostRace();
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (!(error instanceof LostRace)) throw error;
    const status = handoverStatusOf(
      await db.claim.findUniqueOrThrow({ where: { id: claim.id }, select: handoverSelect }),
    );
    if (status === "CANCELLED") return;
    throw conflict(status === "RESOLVED" ? "The item was already returned." : "This handover can no longer be cancelled.");
  }
}

export async function getHandover(user: CurrentUser, claimId: string) {
  const claim = await loadHandoverClaim(user, claimId);
  const status = handoverStatusOf(claim);
  if (!status) throw conflict(NOT_APPROVED);
  return toHandover(claim, user, status);
}

export async function updateHandover(user: CurrentUser, claimId: string, action: HandoverAction) {
  const claim = await loadHandoverClaim(user, claimId);
  const status = handoverStatusOf(claim);
  if (!status) throw conflict(NOT_APPROVED);

  if (action === "COMPLETE") {
    if (status === "CANCELLED") throw conflict("This handover was cancelled.");
    if (status === "APPROVED") await resolveHandover(claim);
  } else {
    if (status === "RESOLVED") throw conflict("The item was already returned.");
    if (status === "APPROVED") await cancelHandover(claim);
  }

  const fresh = await loadHandoverClaim(user, claimId);
  return toHandover(fresh, user, handoverStatusOf(fresh) as HandoverStatus);
}
