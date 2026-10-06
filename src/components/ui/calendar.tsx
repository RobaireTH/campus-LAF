"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Month calendar (react-day-picker) styled with our tokens. Used by DatePicker. */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  const d = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("select-none", className)}
      classNames={{
        root: cn("w-fit", d.root),
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "aria-disabled:opacity-40"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "aria-disabled:opacity-40"),
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-small font-bold",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-caption font-medium text-muted-foreground",
        week: "mt-1 flex",
        day: "relative size-10 p-0 text-center text-small",
        day_button:
          "inline-flex size-10 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40",
        selected:
          "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button:hover]:bg-primary-hover",
        range_start: "rounded-l-md bg-primary/10",
        range_middle: "bg-primary/10 [&>button]:!bg-transparent [&>button]:!text-foreground",
        range_end: "rounded-r-md bg-primary/10",
        today: "[&>button]:ring-1 [&>button]:ring-input",
        outside: "text-muted-foreground/60",
        disabled: "text-muted-foreground/40 [&>button]:cursor-not-allowed [&>button:hover]:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: c }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", c)} />
          ) : (
            <ChevronRight className={cn("size-4", c)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
