import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { cancelOpenClaims } from "@/lib/claims/close";
import { TRANSACTION_OPTIONS, db } from "@/lib/db";
import { conflict, forbidden, notFound } from "@/lib/http/errors";
import { transitionItem } from "@/lib/items/status";
import { matchesText } from "@/lib/items/where";
import { getMediaUrl } from "@/lib/uploads/media";

import {
  ADMIN_PAGE_SIZE,
  REPORT_REASONS,
  type AdminItemSearch,
  type ReportDecision,
  type ReportReason,
  type ReportRequest,
  type VerificationDecision,
} from "./schema";

class LostRace extends Error {}

export const DEFAULT_REJECTION_REASON = "The photo could not be verified. Upload a clearer photo of your school ID.";

const LIST_LIMIT = 100;

function verificationView(user: {
  id: string;
  kycStatus: string;
  kycReviewedAt: Date | null;
  kycRejectionReason: string | null;
}) {
  return { id: user.id, status: user.kycStatus, reviewedAt: user.kycReviewedAt, reason: user.kycRejectionReason };
}

export async function listVerifications() {
  const rows = await db.user.findMany({
    where: { kycStatus: "PENDING", kycIdImageKey: { not: null } },
    orderBy: { kycSubmittedAt: "asc" },
    take: LIST_LIMIT,
    select: { id: true, name: true, email: true, kycSubmittedAt: true, kycIdImageKey: true },
  });
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      submittedAt: row.kycSubmittedAt,
      documentUrl: await getMediaUrl(row.kycIdImageKey as string),
      user: { id: row.id, name: row.name ?? "Unnamed", email: row.email },
    })),
  );
}

export async function decideVerification(admin: CurrentUser, userId: string, input: VerificationDecision) {
  if (userId === admin.id) throw forbidden("You can't review your own ID.");

  const approving = input.decision === "APPROVE";
  const reviewed = { kycReviewedAt: new Date(), kycReviewedById: admin.id };
  const updated = await db.user.updateMany({
    where: { id: userId, kycStatus: "PENDING" },
    data: approving
      ? { kycStatus: "VERIFIED", kycRejectionReason: null, ...reviewed }
      : { kycStatus: "REJECTED", kycRejectionReason: input.reason ?? DEFAULT_REJECTION_REASON, ...reviewed },
  });
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, kycStatus: true, kycReviewedAt: true, kycRejectionReason: true },
  });
  if (!current) throw notFound("User not found");
  if (updated.count === 1 || current.kycStatus === (approving ? "VERIFIED" : "REJECTED")) return verificationView(current);
  throw conflict(
    current.kycStatus === "NOT_SUBMITTED"
      ? "This user has not submitted an ID."
      : `This ID was already ${current.kycStatus.toLowerCase()}.`,
  );
}

export async function createReport(user: CurrentUser, itemId: string, input: ReportRequest) {
  const item = await db.item.findUnique({ where: { id: itemId }, select: { posterId: true, status: true } });
  if (!item || item.status === "REMOVED") throw notFound("Item not found");
  if (item.posterId === user.id) throw forbidden("You can't report your own post.");

  const created = await db.report.createMany({
    data: [{ itemId, reporterId: user.id, reason: input.reason, details: input.details }],
    skipDuplicates: true,
  });
  const report = await db.report.findUniqueOrThrow({
    where: { itemId_reporterId: { itemId, reporterId: user.id } },
    select: { id: true, status: true },
  });
  return { created: created.count === 1, report };
}

export async function listReports() {
  const rows = await db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      reason: true,
      details: true,
      createdAt: true,
      item: { select: { id: true, title: true, status: true } },
      reporter: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    reasonLabel: REPORT_REASONS[row.reason as ReportReason] ?? row.reason,
    details: row.details ?? undefined,
    createdAt: row.createdAt,
    item: row.item,
    reporter: { name: row.reporter.name ?? "Anonymous" },
  }));
}

async function removeItemAsModerator(tx: Prisma.TransactionClient, itemId: string, admin: CurrentUser) {
  await transitionItem(tx, { itemId, from: ["OPEN", "CLAIMED", "RESOLVED"], to: "REMOVED" });
  await cancelOpenClaims(tx, itemId, ["PENDING", "APPROVED"]);
  await tx.report.updateMany({
    where: { itemId, status: "OPEN" },
    data: { status: "ACTIONED", decidedAt: new Date(), decidedById: admin.id },
  });
}

function reportState(reportId: string) {
  return db.report.findUniqueOrThrow({ where: { id: reportId }, select: { id: true, status: true, decidedAt: true } });
}

export async function decideReport(admin: CurrentUser, reportId: string, decision: ReportDecision) {
  const report = await db.report.findUnique({ where: { id: reportId }, select: { id: true, itemId: true } });
  if (!report) throw notFound("Report not found");

  if (decision === "DISMISS") {
    const dismissed = await db.report.updateMany({
      where: { id: report.id, status: "OPEN" },
      data: { status: "DISMISSED", decidedAt: new Date(), decidedById: admin.id },
    });
    const current = await reportState(report.id);
    if (dismissed.count === 1 || current.status === "DISMISSED") return current;
    throw conflict("This report was already acted on.");
  }

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.report.updateMany({
        where: { id: report.id, status: "OPEN" },
        data: { status: "ACTIONED", decidedAt: new Date(), decidedById: admin.id },
      });
      if (claimed.count !== 1) throw new LostRace();
      await removeItemAsModerator(tx, report.itemId, admin);
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (!(error instanceof LostRace)) throw error;
  }
  const current = await reportState(report.id);
  if (current.status === "ACTIONED") return current;
  throw conflict("This report was already dismissed.");
}

export async function listAdminItems(search: AdminItemSearch) {
  const text = matchesText(search.q);
  const where: Prisma.ItemWhereInput = {
    ...(search.status && { status: search.status }),
    ...(search.type && { type: search.type }),
    ...(text.length > 0 && { AND: text }),
  };
  const limit = search.limit ?? ADMIN_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(search.cursor && { cursor: { id: search.cursor }, skip: 1 }),
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        poster: { select: { id: true, name: true, email: true } },
        _count: { select: { claims: true, reports: { where: { status: "OPEN" } } } },
      },
    }),
    db.item.count({ where }),
  ]);
  const page = rows.slice(0, limit);
  return {
    items: page.map(({ _count, ...item }) => ({ ...item, claimCount: _count.claims, openReports: _count.reports })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    total,
  };
}

export async function removeItemAsAdmin(admin: CurrentUser, itemId: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) throw notFound("Item not found");
  await db.$transaction((tx) => removeItemAsModerator(tx, itemId, admin), TRANSACTION_OPTIONS);
  return { id: itemId, status: "REMOVED" as const };
}
