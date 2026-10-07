import type { ClaimStatus, Prisma } from "@/generated/prisma/client";

export function cancelOpenClaims(tx: Prisma.TransactionClient, itemId: string, statuses: readonly ClaimStatus[]) {
  return tx.claim.updateMany({
    where: { itemId, status: { in: [...statuses] } },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
}
