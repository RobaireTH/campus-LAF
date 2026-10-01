"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange, Matcher } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { fieldClasses } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TriggerProps = Omit<React.ComponentProps<"button">, "value" | "onChange" | "children">;

function Trigger({
  label,
  placeholder,
  hasValue,
  onClear,
  className,
  ...props
}: TriggerProps & { label?: string; placeholder: string; hasValue: boolean; onClear?: () => void }) {
  return (
    <div className="relative">
      <button
        type="button"
        data-slot="date-picker-trigger"
        className={cn(
          fieldClasses,
          "flex h-11 items-center gap-2.5 px-3.5 text-left",
          !hasValue && "text-muted-foreground",
          onClear && hasValue && "pr-10",
          className,
        )}
        {...props}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{hasValue ? label : placeholder}</span>
      </button>
      {onClear && hasValue && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear date"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export interface DatePickerProps extends TriggerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  /** Days that can't be picked, e.g. `{ after: new Date() }` for "date lost". */
  disabledDays?: Matcher | Matcher[];
  /** Show an × to clear the value. */
  clearable?: boolean;
}

/**
 * Single date. Default display: "Thu, 1 Oct 2026".
 * <DatePicker id="date" value={date} onChange={setDate} disabledDays={{ after: new Date() }} />
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabledDays,
  clearable,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger
          label={value ? format(value, "EEE, d MMM yyyy") : undefined}
          placeholder={placeholder}
          hasValue={!!value}
          onClear={clearable ? () => onChange?.(undefined) : undefined}
          {...props}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          disabled={disabledDays}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps extends TriggerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabledDays?: Matcher | Matcher[];
  clearable?: boolean;
}

/** From–to range, used by the Browse filters. */
function DateRangePicker({
  value,
  onChange,
  placeholder = "Any date",
  disabledDays,
  clearable = true,
  ...props
}: DateRangePickerProps) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "d MMM")} – ${format(value.to, "d MMM yyyy")}`
      : `From ${format(value.from, "d MMM yyyy")}`
    : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Trigger
          label={label}
          placeholder={placeholder}
          hasValue={!!value?.from}
          onClear={clearable ? () => onChange?.(undefined) : undefined}
          {...props}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="range"
          selected={value}
          defaultMonth={value?.from}
          disabled={disabledDays}
          onSelect={onChange}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, DateRangePicker };
export type { DateRange };
