"use server";

import { browseItems } from "@/lib/items/queries";
import type { ItemSearchParams, ItemSearchResponse } from "@/lib/items/types";

/** "Load more" on Browse: next page for the same filters. */
export async function loadMoreItems(params: ItemSearchParams, cursor: string): Promise<ItemSearchResponse> {
  return browseItems({ ...params, cursor });
}
