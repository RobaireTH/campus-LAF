import type { ClaimStatus, ItemStatus, ItemType } from "@/lib/items/types";

export type ClaimTone = "success" | "warning" | "danger" | "neutral";
export type ClaimViewer = "claimant" | "poster";

export interface ClaimProgress {
  label: string;
  tone: ClaimTone;
  description: string;
}

export interface ClaimSnapshot {
  status: ClaimStatus;
  itemStatus: ItemStatus;
}

const CLOSED: ClaimProgress = {
  label: "Closed",
  tone: "neutral",
  description: "This item is no longer open for claims.",
};

const BY_VIEWER = {
  claimant: {
    pending: { label: "Waiting for the poster", tone: "warning", description: "The poster is reviewing your claim." },
    approved: { label: "Approved", tone: "success", description: "Contact the poster and arrange the handover." },
  },
  poster: {
    pending: { label: "Needs your review", tone: "warning", description: "Compare the details, then approve or reject." },
    approved: { label: "Approved", tone: "success", description: "Contact the claimant and finish the handover." },
  },
} satisfies Record<ClaimViewer, Record<string, ClaimProgress>>;

export function claimProgress({ status, itemStatus }: ClaimSnapshot, viewer: ClaimViewer = "claimant"): ClaimProgress {
  switch (status) {
    case "PENDING":
      return itemStatus === "OPEN" ? BY_VIEWER[viewer].pending : CLOSED;
    case "APPROVED":
      return itemStatus === "RESOLVED"
        ? { label: "Returned", tone: "success", description: "The handover is complete." }
        : BY_VIEWER[viewer].approved;
    case "REJECTED":
      return { label: "Not approved", tone: "danger", description: "This claim was not approved." };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "neutral",
        description: "The handover was cancelled or the post was removed.",
      };
  }
}

export interface ClaimCopy {
  title: string;
  intro: string;
  detailsLabel: string;
  detailsHint: string;
  detailsPlaceholder: string;
  mediaLabel: string;
  mediaHint: string;
  confirmation: string;
  reviewIntro: string;
  sentIntro: string;
}

const CLAIM_COPY: Record<ItemType, ClaimCopy> = {
  FOUND: {
    title: "Claim this item",
    intro: "Share details that only the real owner would know.",
    detailsLabel: "Ownership details",
    detailsHint: "Mention private details such as a scratch, sticker, contents, receipt, or lock screen.",
    detailsPlaceholder: "Describe what makes this item yours...",
    mediaLabel: "Proof media",
    mediaHint: "A receipt, matching accessory, or earlier photo can help.",
    confirmation: "I confirm this item belongs to me. I understand false claims may suspend my account.",
    reviewIntro: "Compare private ownership details before choosing a claimant.",
    sentIntro: "The poster will review your ownership details. You can track the result from your dashboard.",
  },
  LOST: {
    title: "I found this",
    intro: "Tell the owner where you found it and where it is now.",
    detailsLabel: "What you found",
    detailsHint: "Say where you found it, where it is now, and one detail only the finder would see.",
    detailsPlaceholder: "Describe where you found it and where you have it now...",
    mediaLabel: "Photos or video",
    mediaHint: "A photo shows the owner you have the right item.",
    confirmation: "I confirm I found this item and have it with me. I understand false claims may suspend my account.",
    reviewIntro: "Compare what each finder tells you before choosing one.",
    sentIntro: "The owner will review what you found. You can track the result from your dashboard.",
  },
};

export const claimCopy = (type: ItemType): ClaimCopy => CLAIM_COPY[type];
