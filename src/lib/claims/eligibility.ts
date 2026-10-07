import { itemRoutes } from "@/lib/items/routes";
import type { ClaimStatus, ItemStatus } from "@/lib/items/types";

export interface ClaimBlocker {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export interface ClaimSubject {
  id: string;
  status: ItemStatus;
  isOwner: boolean;
  myClaim: { id: string; status: ClaimStatus } | null;
}

const NOT_OPEN: Record<Exclude<ItemStatus, "OPEN">, ClaimBlocker> = {
  CLAIMED: {
    title: "A claim was already approved",
    description: "The handover is in progress. If it falls through, the post opens for claims again.",
  },
  RESOLVED: {
    title: "This item was already returned",
    description: "It went back to its owner, so there is nothing left to claim.",
  },
  REMOVED: {
    title: "This post was removed",
    description: "It is no longer open for claims.",
  },
};

export function claimBlocker(item: ClaimSubject): ClaimBlocker | null {
  if (item.isOwner) {
    return {
      title: "This is your post",
      description: "You can't claim your own item. Review the claims people send you instead.",
      action: { label: "Review claims", href: itemRoutes.claims(item.id) },
    };
  }
  if (item.myClaim?.status === "PENDING") {
    return {
      title: "You already sent a claim",
      description: "The poster is reviewing it. You will see the result on your dashboard.",
      action: { label: "See my claims", href: itemRoutes.myClaims },
    };
  }
  if (item.myClaim?.status === "APPROVED" && item.status === "CLAIMED") {
    return {
      title: "Your claim was approved",
      description: "Contact the poster and arrange the handover.",
      action: { label: "Contact and handover", href: itemRoutes.handover(item.myClaim.id) },
    };
  }
  return item.status === "OPEN" ? null : NOT_OPEN[item.status];
}
