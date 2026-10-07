/**
 * Item shapes the pages use. These follow the API contracts in Linear:
 *   SOF-11  GET /api/items        → ItemSearchResponse (list of ItemCardData)
 *   SOF-12  GET /api/items/:id    → ItemDetail
 * If the backend shapes change, update them here and the pages follow.
 */

export type ItemType = "LOST" | "FOUND";
export type ItemStatus = "OPEN" | "CLAIMED" | "RESOLVED" | "REMOVED";
export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** One result on Browse — also the props shape for the item card (SOF-27). */
export interface ItemCardData {
  id: string;
  title: string;
  type: ItemType;
  category: string;
  location: string;
  /** When it was lost / found (ISO date). */
  date: string;
  status: ItemStatus;
  /** First photo, or null → the card shows a fallback. */
  thumbnailUrl: string | null;
}

export interface ItemSearchParams {
  q?: string;
  type?: ItemType;
  category?: string;
  location?: string;
  /** yyyy-MM-dd */
  from?: string;
  /** yyyy-MM-dd */
  to?: string;
  sort?: "newest" | "oldest";
  cursor?: string;
  limit?: number;
}

export interface ItemSearchResponse {
  items: ItemCardData[];
  /** Pass back as `cursor` to get the next page; null when there are no more. */
  nextCursor: string | null;
  total: number;
}

export interface ItemMedia {
  id: string;
  url: string;
  kind: "IMAGE" | "VIDEO";
}

export interface ItemDetail extends Omit<ItemCardData, "thumbnailUrl"> {
  description: string;
  /** Extra detail about where, e.g. "2nd floor, near the printers". */
  locationNote: string | null;
  media: ItemMedia[];
  /** When the post was created (ISO). */
  postedAt: string;
  /** Display name or "Anonymous" — never contact details (SOF-12). */
  poster: { displayName: string };
  /** True when the viewer posted this item. */
  isOwner: boolean;
  /** The viewer's own claim on this item, if any. */
  myClaim: { id: string; status: ClaimStatus } | null;
  /** Only meaningful for the owner. */
  claimCount: number;
}

export interface Option {
  value: string;
  label: string;
}
