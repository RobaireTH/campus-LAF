import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary text-primary-foreground",
        outline: "border border-border bg-card text-foreground",
        // Item type
        lost: "bg-lost text-lost-foreground",
        found: "bg-found text-found-foreground",
        // Item status
        open: "bg-status-open text-status-open-foreground",
        claimed: "bg-status-claimed text-status-claimed-foreground",
        resolved: "bg-status-resolved text-status-resolved-foreground",
        // Generic feedback (claims, KYC, moderation…)
        success: "bg-success-soft text-success-soft-foreground",
        warning: "bg-warning-soft text-warning-soft-foreground",
        danger: "bg-danger-soft text-danger-soft-foreground",
      },
      uppercase: {
        true: "uppercase tracking-wide",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, uppercase, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, uppercase }), className)} {...props} />;
}

/* ---- Helpers that map API enums straight to the right badge ---- */

export type ItemType = "LOST" | "FOUND";
export type ItemStatus = "OPEN" | "CLAIMED" | "RESOLVED";

/** LOST / FOUND badge. `<ItemTypeBadge type={item.type} />` */
function ItemTypeBadge({ type, className }: { type: ItemType; className?: string }) {
  return (
    <Badge variant={type === "LOST" ? "lost" : "found"} uppercase className={className}>
      {type === "LOST" ? "Lost" : "Found"}
    </Badge>
  );
}

const statusLabel: Record<ItemStatus, string> = { OPEN: "Open", CLAIMED: "Claimed", RESOLVED: "Resolved" };

/** Open / Claimed / Resolved badge. `<ItemStatusBadge status={item.status} />` */
function ItemStatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  const variant = status === "OPEN" ? "open" : status === "CLAIMED" ? "claimed" : "resolved";
  return (
    <Badge variant={variant} className={className}>
      {statusLabel[status]}
    </Badge>
  );
}

export { Badge, ItemStatusBadge, ItemTypeBadge, badgeVariants };
