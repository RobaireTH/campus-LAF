import "server-only";

import { headers } from "next/headers";
import type { ItemCardData, ItemDetail, ItemSearchParams, ItemSearchResponse, ItemType } from "./types";

async function apiUrl(path: string) {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (!host) throw new Error("Request host is unavailable");
  return new URL(path, `${protocol}://${host}`);
}

async function request(path: string) {
  const incoming = await headers();
  const response = await fetch(await apiUrl(path), {
    cache: "no-store",
    headers: { cookie: incoming.get("cookie") ?? "", authorization: incoming.get("authorization") ?? "" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Item service returned ${response.status}`);
  return response.json();
}

export async function searchItems(params: ItemSearchParams): Promise<ItemSearchResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  let data;
  try {
    data = await request(`/api/items?${query}`);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return previewItems(params);
  }
  const items: ItemCardData[] = (data?.items ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    title: String(item.title),
    type: item.type as ItemCardData["type"],
    category: String(item.category),
    location: String(item.location),
    date: String(item.date),
    status: item.status as ItemCardData["status"],
    thumbnailUrl: typeof item.thumbnailUrl === "string" ? item.thumbnailUrl : typeof item.thumbnail === "string" && item.thumbnail.startsWith("http") ? item.thumbnail : null,
  }));
  return { items, nextCursor: data?.nextCursor ?? null, total: data?.total ?? items.length };
}

export async function getItem(id: string): Promise<ItemDetail | null> {
  let data;
  try {
    data = await request(`/api/items/${encodeURIComponent(id)}`);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    const { mockItems } = await import("./mock-data");
    return mockItems.find((item) => item.id === id) ?? null;
  }
  if (!data) return null;
  const item = data.item;
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    category: typeof item.category === "string" ? item.category : item.category.name,
    location: typeof item.location === "string" ? item.location : item.location.name,
    date: item.eventDate ?? item.date,
    status: item.status,
    description: item.description,
    locationNote: item.locationNote ?? null,
    media: (item.media ?? []).map((media: Record<string, unknown>, index: number) => ({ id: String(media.id ?? index), url: String(media.url ?? ""), kind: media.kind === "VIDEO" || media.type === "VIDEO" ? "VIDEO" : "IMAGE" })),
    postedAt: item.createdAt ?? item.postedAt,
    poster: { displayName: item.posterName ?? item.poster?.displayName ?? "Anonymous" },
    isOwner: Boolean(item.isOwner),
    myClaim: item.myClaim ?? (item.hasClaimed ? { id: "existing", status: "PENDING" } : null),
    claimCount: Number(item.claimCount ?? 0),
  };
}

async function previewItems(params: ItemSearchParams): Promise<ItemSearchResponse> {
  const { categoryLabel, locationLabel, mockItems } = await import("./mock-data");
  const query = params.q?.trim().toLowerCase();
  const from = params.from ? new Date(`${params.from}T00:00:00`).getTime() : null;
  const to = params.to ? new Date(`${params.to}T23:59:59`).getTime() : null;
  const filtered = mockItems.filter((item) => {
    if (item.status !== "OPEN") return false;
    if (params.type && item.type !== params.type) return false;
    if (params.category && item.category !== categoryLabel(params.category)) return false;
    if (params.location && item.location !== locationLabel(params.location)) return false;
    const timestamp = new Date(item.date).getTime();
    if (from && timestamp < from) return false;
    if (to && timestamp > to) return false;
    return !query || `${item.title} ${item.description}`.toLowerCase().includes(query);
  }).sort((left, right) => {
    const difference = new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
    return params.sort === "oldest" ? -difference : difference;
  });
  const start = params.cursor ? Number(params.cursor) || 0 : 0;
  const limit = params.limit ?? 12;
  const page = filtered.slice(start, start + limit);
  return {
    items: page.map((item) => ({ id: item.id, title: item.title, type: item.type, category: item.category, location: item.location, date: item.date, status: item.status, thumbnailUrl: item.media.find((media) => media.kind === "IMAGE")?.url ?? null })),
    nextCursor: start + limit < filtered.length ? String(start + limit) : null,
    total: filtered.length,
  };
}

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): ItemSearchParams {
  const one = (key: string) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const type = one("type")?.toUpperCase();
  const date = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
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
