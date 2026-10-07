import type { ItemStatus, ItemType } from "@/lib/items/types";

export interface VerificationEntry {
  id: string;
  submittedAt: string | null;
  documentUrl: string;
  user: { id: string; name: string; email: string };
}

export interface ReportEntry {
  id: string;
  reasonLabel: string;
  details?: string;
  createdAt: string;
  item: { id: string; title: string; status: ItemStatus };
  reporter: { name: string };
}

export interface AdminPost {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  createdAt: string;
  poster: { id: string; name: string | null; email: string };
  claimCount: number;
  openReports: number;
}

export interface AdminPostsPage {
  items: AdminPost[];
  nextCursor: string | null;
  total: number;
}
