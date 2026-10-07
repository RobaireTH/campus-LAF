import type { ItemStatus, Prisma } from "@/generated/prisma/client";

const ALLOWED: Record<ItemStatus, readonly ItemStatus[]> = {
  OPEN: ["CLAIMED", "REMOVED"],
  CLAIMED: ["RESOLVED", "OPEN", "REMOVED"],
  RESOLVED: ["REMOVED"],
  REMOVED: [],
};

interface Transition {
  itemId: string;
  from: ItemStatus;
  to: ItemStatus;
  posterId?: string;
}

export const canTransition = (from: ItemStatus, to: ItemStatus) => ALLOWED[from].includes(to);

export async function transitionItem(tx: Prisma.TransactionClient, { itemId, from, to, posterId }: Transition) {
  if (!canTransition(from, to)) throw new Error(`Illegal item transition from ${from} to ${to}`);
  const moved = await tx.item.updateMany({
    where: { id: itemId, status: from, ...(posterId && { posterId }) },
    data: { status: to },
  });
  return moved.count === 1;
}
