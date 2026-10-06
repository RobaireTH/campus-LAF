import Link from "next/link";
import type { ReactNode } from "react";
import type { ItemSummary } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { StatusChip } from "@/components/ui/StatusChip";

// Placeholder photo colours until real photoUrl images are wired in.
const photoColors = ["bg-photo-yellow", "bg-photo-lavender", "bg-photo-orange"];

export function ItemCard({
  item,
  trailing,
  colorIndex = 0,
  bordered = true,
}: {
  item: ItemSummary;
  trailing?: ReactNode; // right-hand slot: a Review button, a Badge, or nothing
  colorIndex?: number;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-white p-3 ${
        bordered ? "border border-line" : ""
      }`}
    >
      <Link
        href={`/items/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-2 focus-visible:outline-brand"
      >
        {/* TODO: use next/image with item.photoUrl */}
        <div
          className={`flex size-20 shrink-0 items-center justify-center rounded-xl text-sm text-ink ${
            photoColors[colorIndex % photoColors.length]
          }`}
        >
          photo
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-ink">{item.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {item.location} · {timeAgo(item.createdAt)}
          </p>
          <div className="mt-1.5">
            <StatusChip type={item.type} />
          </div>
        </div>
      </Link>
      {trailing}
    </div>
  );
}
