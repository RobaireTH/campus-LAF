import * as React from "react";

import { cn } from "@/lib/utils";

const widths = {
  page: "max-w-page", // default: browse, dashboard, admin
  form: "max-w-form", // login, register, report, claim
  full: "max-w-none",
} as const;

export interface PageContainerProps extends Omit<React.ComponentProps<"main">, "title"> {
  width?: keyof typeof widths;
  /** Optional page heading row. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons shown next to the title (right on desktop, below on phones). */
  actions?: React.ReactNode;
}

/**
 * Standard page wrapper: centred, side gutters, and bottom padding that clears the
 * mobile bottom nav.
 *
 * <PageContainer title="My posts" actions={<Button>Report an item</Button>}>…</PageContainer>
 */
export function PageContainer({
  width = "page",
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-gutter pt-6 pb-[calc(var(--spacing-bottom-nav)+2rem)] md:pb-12 lg:px-gutter-lg lg:pt-10",
        widths[width],
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            {title && <h1 className="text-h2 lg:text-h1">{title}</h1>}
            {description && <p className="text-body text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </main>
  );
}
