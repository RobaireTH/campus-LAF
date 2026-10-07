"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ProofMedia {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
}

interface ProofGalleryProps {
  media: ProofMedia[];
  label: string;
  shape?: "square" | "card";
}

const SHAPES = { square: "size-20", card: "h-24 w-36" } as const;

export function ProofGallery({ media, label, shape = "square" }: ProofGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number>();
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  if (media.length === 0) return null;

  const current = openIndex === undefined ? undefined : media[openIndex];
  const nameOf = (index: number) => `${label} ${index + 1} of ${media.length}`;
  const markFailed = (id: string) => setFailed((known) => new Set(known).add(id));
  const step = (direction: 1 | -1) =>
    setOpenIndex((index) => (index === undefined ? index : (index + direction + media.length) % media.length));

  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label={`${label} files`}>
        {media.map((file, index) => (
          <li key={file.id}>
            {failed.has(file.id) ? (
              <span
                role="img"
                aria-label={`${nameOf(index)} could not be loaded`}
                className={cn(
                  SHAPES[shape],
                  "flex flex-col items-center justify-center gap-1 rounded-md border bg-muted px-1 text-center text-caption text-muted-foreground",
                )}
              >
                <ImageOff className="size-5" aria-hidden />
                Reload to view
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`${file.type === "VIDEO" ? "Play" : "Enlarge"} ${nameOf(index)}`}
                className={cn(
                  SHAPES[shape],
                  "relative block cursor-zoom-in overflow-hidden rounded-md border bg-muted outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/40",
                )}
              >
                {file.type === "VIDEO" ? (
                  <span className="flex size-full flex-col items-center justify-center gap-1 text-small text-muted-foreground">
                    <Play className="size-6" aria-hidden />
                    Video
                  </span>
                ) : (
                  <Image
                    src={file.url}
                    alt=""
                    fill
                    unoptimized
                    sizes="144px"
                    className="object-cover"
                    onError={() => markFailed(file.id)}
                  />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={current !== undefined} onOpenChange={(open) => !open && setOpenIndex(undefined)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-none gap-3 p-3 sm:max-w-4xl sm:p-4"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          <DialogTitle className="sr-only">{openIndex === undefined ? label : nameOf(openIndex)}</DialogTitle>
          {current && (
            <div className="relative h-[65dvh] w-full overflow-hidden rounded-lg bg-muted">
              {current.type === "VIDEO" ? (
                <video
                  key={current.id}
                  src={current.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-contain"
                  aria-label={nameOf(openIndex ?? 0)}
                />
              ) : (
                <Image
                  key={current.id}
                  src={current.url}
                  alt={nameOf(openIndex ?? 0)}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                />
              )}
            </div>
          )}
          {media.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => step(-1)}>
                <ChevronLeft />
                Previous
              </Button>
              <span className="text-small text-muted-foreground" aria-live="polite">
                {(openIndex ?? 0) + 1} of {media.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => step(1)}>
                Next
                <ChevronRight />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
