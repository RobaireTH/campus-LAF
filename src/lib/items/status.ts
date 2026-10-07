import type { ItemStatus, Prisma } from "@/generated/prisma/client";

const ALLOWED: Record<ItemStatus, readonly ItemStatus[]> = {
  OPEN: ["CLAIMED", "REMOVED"],
  CLAIMED: ["RESOLVED", "OPEN", "REMOVED"],
  RESOLVED: ["REMOVED"],
  REMOVED: [],
};

interface Transition {
  itemId: string;
  from: ItemStatus | readonly ItemStatus[];
  to: ItemStatus;
  posterId?: string;
}

export const canTransition = (from: ItemStatus, to: ItemStatus) => ALLOWED[from].includes(to);

export async function transitionItem(tx: Prisma.TransactionClient, { itemId, from, to, posterId }: Transition) {
  const sources = typeof from === "string" ? [from] : from;
  for (const source of sources) {
    if (!canTransition(source, to)) throw new Error(`Illegal item transition from ${source} to ${to}`);
  }
  const moved = await tx.item.updateMany({
    where: { id: itemId, status: typeof from === "string" ? from : { in: [...from] }, ...(posterId && { posterId }) },
    data: { status: to },
  });
  return moved.count === 1;
}
