"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ItemMedia } from "@/lib/items/types";

function MediaView({ m, title, index, full }: { m: ItemMedia; title: string; index: number; full?: boolean }) {
  if (m.kind === "VIDEO") {
    return (
      <video
        src={m.url}
        controls
        playsInline
        preload="metadata"
        className={cn("size-full bg-foreground", full ? "object-contain" : "object-cover")}
        aria-label={`${title} — video ${index + 1}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- media host (R2) not configured for next/image yet
    <img
      src={m.url}
      alt={`${title} — photo ${index + 1}`}
      className={cn("size-full select-none", full ? "object-contain" : "object-cover")}
      draggable={false}
    />
  );
}

/** Swipeable strip (CSS scroll-snap) shared by the inline gallery and the lightbox. */
function Strip({
  media,
  title,
  index,
  onIndex,
  full,
  onOpen,
}: {
  media: ItemMedia[];
  title: string;
  index: number;
  onIndex: (i: number) => void;
  full?: boolean;
  onOpen?: (i: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Scroll when the index changes from buttons/thumbnails.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  return (
    <div className="relative size-full">
      <div
        ref={ref}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) onIndex(i);
        }}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onIndex(Math.min(index + 1, media.length - 1));
          if (e.key === "ArrowLeft") onIndex(Math.max(index - 1, 0));
        }}
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className="relative size-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${media.length}`}
          >
            {onOpen && m.kind === "IMAGE" ? (
              <button type="button" className="size-full cursor-zoom-in" onClick={() => onOpen(i)} aria-label="Enlarge photo">
                <MediaView m={m} title={title} index={i} />
              </button>
            ) : (
              <MediaView m={m} title={title} index={i} full={full} />
            )}
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => onIndex(Math.max(index - 1, 0))}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow-card hover:bg-card disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onIndex(Math.min(index + 1, media.length - 1))}
            disabled={index === media.length - 1}
            aria-label="Next photo"
            className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow-card hover:bg-card disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {media.map((m, i) => (
              <span key={m.id} className={cn("size-2 rounded-full bg-card/70 shadow-card", i === index && "w-5 bg-card")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Media gallery for Item details: swipe on phones, arrows on desktop, tap to enlarge. */
export function ItemGallery({ media, title }: { media: ItemMedia[]; title: string }) {
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  if (media.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border bg-muted text-muted-foreground">
        <ImageOff className="size-8" aria-hidden />
        <span className="text-small">No photos for this item</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
        <Strip
          media={media}
          title={title}
          index={index}
          onIndex={setIndex}
          onOpen={(i) => {
            setIndex(i);
            setOpen(true);
          }}
        />
        <span className="pointer-events-none absolute top-3 right-3 hidden items-center gap-1 rounded-full bg-foreground/60 px-2.5 py-1 text-caption text-background sm:inline-flex">
          <Maximize2 className="size-3" aria-hidden /> Tap to enlarge
        </span>
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose photo">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-md border-2 border-transparent bg-muted opacity-70 outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40",
                i === index && "border-primary opacity-100",
              )}
            >
              {m.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail
                <img src={m.url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-caption">Video</span>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[85dvh] max-w-none p-0 sm:h-[90dvh] sm:max-w-5xl sm:bg-foreground sm:p-0 sm:pb-0">
          <DialogTitle className="sr-only">{title} — photos</DialogTitle>
          <Strip media={media} title={title} index={index} onIndex={setIndex} full />
        </DialogContent>
      </Dialog>
    </div>
  );
}
