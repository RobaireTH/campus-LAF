"use client";

import * as React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ItemCardTemp } from "@/components/items/item-card-temp";
import type { ItemCardData, ItemSearchParams } from "@/lib/items/types";
import { loadMoreItems } from "./actions";

interface Props {
  params: ItemSearchParams;
  initialItems: ItemCardData[];
  initialCursor: string | null;
  hasFilters: boolean;
}

/**
 * Results grid with "Load more". The first page is server-rendered; more pages come from
 * a server action with the same filters. The page keys this component by the query, so
 * changing filters starts fresh.
 */
export function BrowseResults({ params, initialItems, initialCursor, hasFilters }: Props) {
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, startLoading] = React.useTransition();

  if (items.length === 0) {
    // TODO(SOF-32): swap for Nurain's shared "No results" empty state.
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden />
        <h2 className="text-h3">Nothing matches yet</h2>
        <p className="max-w-sm text-muted-foreground">
          {hasFilters
            ? "Try different keywords or clear some filters. New items come in every day."
            : "No items have been posted yet."}
        </p>
        <Button asChild variant="secondary">
          <Link href="/report">Report your item so finders can reach you</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="flex">
            {/* TODO(SOF-27): replace with Nurain's <ItemCard item={item} /> */}
            <ItemCardTemp item={item} className="flex-1" />
          </li>
        ))}
      </ul>
      {cursor && (
        <Button
          variant="outline"
          className="self-center"
          loading={loading}
          onClick={() =>
            startLoading(async () => {
              try {
                const res = await loadMoreItems(params, cursor);
                setItems((prev) => [...prev, ...res.items]);
                setCursor(res.nextCursor);
              } catch {
                toast.error("Couldn't load more items", { description: "Check your connection and try again." });
              }
            })
          }
        >
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
