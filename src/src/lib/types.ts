// Keep these aligned with the SOF-12 response shape. Adjust field names once you've read the issue.
export type ItemType = "FOUND" | "LOST";

export type ItemSummary = {
  id: string;
  title: string;
  type: ItemType;
  location: string;
  createdAt: string; // ISO date string
  photoUrl?: string | null;
  claimCount?: number; // only present on the poster's own items
};

export type CurrentUser = {
  name: string;
  initials: string;
  verified: boolean;
};

export type DashboardData = {
  user: CurrentUser;
  stats: { posts: number; claimsToReview: number; claims: number };
  needsAction: ItemSummary[]; // my items that have claims waiting
  matches: ItemSummary[]; // possible matches for my lost item
  recent: ItemSummary[]; // my recent posts
};
