import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/lib/auth";

import { itemSearchSchema } from "./schema";
import { getItemDetail, searchItems } from "./service";
import type { ItemDetail, ItemSearchParams, ItemSearchResponse } from "./types";

export async function browseItems(params: ItemSearchParams): Promise<ItemSearchResponse> {
  const parsed = itemSearchSchema.safeParse(params);
  return searchItems(parsed.success ? parsed.data : {});
}

export const getItem = cache(
  async (id: string): Promise<ItemDetail | null> => getItemDetail(id, await getCurrentUser()),
);
