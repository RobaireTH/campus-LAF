import type { ItemSearchParams, ItemType } from "./types";

const MAX_QUERY_LENGTH = 100;
const MAX_ID_LENGTH = 64;
const MAX_OTHER_LENGTH = 200;

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): ItemSearchParams {
  const one = (key: string, max = MAX_OTHER_LENGTH) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, max) || undefined;
  };
  const type = one("type")?.toUpperCase();
  const date = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
  return {
    q: one("q", MAX_QUERY_LENGTH),
    type: type === "LOST" || type === "FOUND" ? (type as ItemType) : undefined,
    category: one("category", MAX_ID_LENGTH),
    location: one("location", MAX_ID_LENGTH),
    from: date(one("from")),
    to: date(one("to")),
    sort: one("sort") === "oldest" ? "oldest" : undefined,
  };
}
