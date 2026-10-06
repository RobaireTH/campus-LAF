import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FieldProps {
  /** The id of the control inside, so the label and messages are linked to it. */
  id: string;
  label: React.ReactNode;
  /** Helper text under the field. Hidden while there is an error. */
  hint?: React.ReactNode;
  /** Error message. Shown in red and announced to screen readers. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /**
   * The control. Field passes `aria-describedby` and `aria-invalid` down to it,
   * so pass a single element (Input, Textarea, Select trigger, DatePicker…).
   */
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Label + control + hint/error, laid out and wired up for accessibility.
 *
 * <Field id="title" label="Item name" hint="e.g. Black JanSport backpack" error={errors.title}>
 *   <Input id="title" {...register("title")} />
 * </Field>
 */
function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            *
          </span>
        )}
      </Label>
      {React.cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
