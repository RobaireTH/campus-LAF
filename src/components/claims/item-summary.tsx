import Image from "next/image";
import { ImageOff } from "lucide-react";

import { ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { friendlyDate } from "@/lib/format";
import type { ItemDetail } from "@/lib/items/types";

export function ItemSummary({ item }: { item: ItemDetail }) {
  const photo = item.media.find((file) => file.kind === "IMAGE");
  const where = item.type === "LOST" ? "Last seen" : "Found at";

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-3 shadow-card">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {photo ? (
          <Image src={photo.url} alt="" fill unoptimized sizes="80px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <ItemTypeBadge type={item.type} />
          <ItemStatusBadge status={item.status} />
        </div>
        <p className="truncate font-semibold">{item.title}</p>
        <p className="truncate text-small text-muted-foreground">
          {where} {item.location} · {friendlyDate(item.date)}
        </p>
      </div>
    </div>
  );
}
