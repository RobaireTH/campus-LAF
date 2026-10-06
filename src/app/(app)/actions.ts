"use server";

import { searchItems } from "@/lib/items/api";
import type { ItemSearchParams, ItemSearchResponse } from "@/lib/items/types";

/** "Load more" on Browse: next page for the same filters. */
export async function loadMoreItems(params: ItemSearchParams, cursor: string): Promise<ItemSearchResponse> {
  return searchItems({ ...params, cursor });
}
