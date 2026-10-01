import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared look for text-like fields (Input, Textarea, Select trigger, Date picker). */
export const fieldClasses =
  "w-full min-w-0 rounded-md border border-input bg-card text-body text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-11 px-3.5 file:mr-3 file:border-0 file:bg-transparent file:text-small file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
