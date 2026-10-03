import "server-only";

import { categoryLabel, locationLabel, mockItems } from "./mock-data";
import type { ItemCardData, ItemDetail, ItemSearchParams, ItemSearchResponse, ItemType } from "./types";

/*
 * Data access for Browse + Item details.
 * Right now this reads mock data (./mock-data). Integration (SOF-19) swaps the bodies of
 * `searchItems` and `getItem` for calls to GET /api/items (SOF-11) and GET /api/items/:id
 * (SOF-12). Keep the signatures and the pages won't need to change.
 */

const PAGE_SIZE = 12;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toCard(i: ItemDetail): ItemCardData {
  return {
    id: i.id,
    title: i.title,
    type: i.type,
    category: i.category,
    location: i.location,
    date: i.date,
    status: i.status,
    thumbnailUrl: i.media.find((m) => m.kind === "IMAGE")?.url ?? null,
  };
}

export async function searchItems(params: ItemSearchParams): Promise<ItemSearchResponse> {
  await wait(250); // feel the loading states while mocking
  const q = params.q?.trim().toLowerCase();
  const from = params.from ? new Date(`${params.from}T00:00:00`).getTime() : null;
  const to = params.to ? new Date(`${params.to}T23:59:59`).getTime() : null;

  let list = mockItems.filter((i) => {
    if (i.status !== "OPEN") return false; // SOF-11: status defaults to OPEN
    if (params.type && i.type !== params.type) return false;
    if (params.category && i.category !== categoryLabel(params.category)) return false;
    if (params.location && i.location !== locationLabel(params.location)) return false;
    const t = new Date(i.date).getTime();
    if (from && t < from) return false;
    if (to && t > to) return false;
    if (q && !`${i.title} ${i.description}`.toLowerCase().includes(q)) return false;
    return true;
  });

  list = list.sort((a, b) => {
    const d = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    return params.sort === "oldest" ? -d : d;
  });

  const start = params.cursor ? Number(params.cursor) || 0 : 0;
  const limit = params.limit ?? PAGE_SIZE;
  const page = list.slice(start, start + limit);
  const next = start + limit < list.length ? String(start + limit) : null;
  return { items: page.map(toCard), nextCursor: next, total: list.length };
}

/** Dev-only viewer override for the mock: ?as=owner | claimant */
export type MockViewer = "owner" | "claimant";

export async function getItem(id: string, mockAs?: MockViewer): Promise<ItemDetail | null> {
  await wait(200);
  const item = mockItems.find((i) => i.id === id);
  if (!item) return null;
  return {
    ...item,
    isOwner: mockAs === "owner",
    myClaim: mockAs === "claimant" ? { id: "clm_1", status: "PENDING" } : null,
  };
}

/** Read the Browse filters from the URL. Bad values are ignored. */
export function parseSearchParams(sp: Record<string, string | string[] | undefined>): ItemSearchParams {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const type = one("type")?.toUpperCase();
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    q: one("q"),
    type: type === "LOST" || type === "FOUND" ? (type as ItemType) : undefined,
    category: one("category"),
    location: one("location"),
    from: date(one("from")),
    to: date(one("to")),
    sort: one("sort") === "oldest" ? "oldest" : undefined,
  };
}
