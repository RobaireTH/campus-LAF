import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import type { ItemCardData } from "@/lib/items/types";

/**
 * TEMPORARY stand-in so Browse works today. Nurain's item card (SOF-27) replaces it:
 * swap the import in src/app/(app)/browse-results.tsx and delete this file.
 * Props are the SOF-11 card shape (`ItemCardData`) — the same props SOF-27 should take.
 */
export function ItemCardTemp({ item, className }: { item: ItemCardData; className?: string }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card outline-none transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-pop focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- temp card; SOF-27 decides image handling
          <img src={item.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            <span className="text-caption">No photo</span>
          </div>
        )}
        <ItemTypeBadge type={item.type} className="absolute top-2.5 left-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-sans text-body font-semibold group-hover:text-primary">{item.title}</h3>
        <p className="flex items-center gap-1 text-small text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{item.location}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="text-caption text-muted-foreground" suppressHydrationWarning>
            {item.category} · {timeAgo(item.date)}
          </span>
          {item.status !== "OPEN" && <ItemStatusBadge status={item.status} />}
        </div>
      </div>
    </Link>
  );
}
