"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-8 text-caption",
  md: "size-10 text-small",
  lg: "size-14 text-body",
} as const;

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  /** Adds a small "verified student" check. */
  verified?: boolean;
  className?: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Photo with an initials fallback. `<UserAvatar name="Ada Obi" verified />` */
function UserAvatar({ name, src, size = "md", verified, className }: UserAvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn("relative flex overflow-hidden rounded-full bg-accent", sizes[size])}
      >
        {src && <AvatarPrimitive.Image src={src} alt={name} className="aspect-square size-full object-cover" />}
        <AvatarPrimitive.Fallback
          delayMs={src ? 300 : 0}
          className="flex size-full items-center justify-center font-semibold text-accent-foreground"
        >
          {initials(name) || "?"}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {verified && (
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-full bg-card text-success"
          title="Verified student"
        >
          <BadgeCheck className={size === "lg" ? "size-5" : "size-4"} aria-label="Verified student" />
        </span>
      )}
    </span>
  );
}

export { UserAvatar };
