"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  REJECTION_NOTE_MAX,
  REJECTION_REASONS,
  composeRejectionReason,
  type RejectionReasonValue,
} from "@/lib/moderation/reasons";

interface RejectIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onReject: (reason: string) => Promise<boolean>;
}

export function RejectIdDialog({ open, onOpenChange, name, onReject }: RejectIdDialogProps) {
  const [value, setValue] = useState<RejectionReasonValue>();
  const [note, setNote] = useState("");
  const reason = composeRejectionReason(value, note);

  function changeOpen(next: boolean) {
    if (!next) {
      setValue(undefined);
      setNote("");
    }
    onOpenChange(next);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={changeOpen}
      title={`Reject ${name}'s ID?`}
      description="They will see this reason and can upload a new photo."
      confirmLabel="Reject ID"
      tone="danger"
      disabled={reason === null}
      onConfirm={() => (reason ? onReject(reason) : Promise.resolve(false))}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-small font-semibold">Why is it being rejected?</legend>
        {REJECTION_REASONS.map((choice) => (
          <label
            key={choice.value}
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-small has-[:checked]:border-primary has-[:checked]:bg-accent"
          >
            <input
              type="radio"
              name="rejection-reason"
              value={choice.value}
              checked={value === choice.value}
              onChange={() => setValue(choice.value)}
              className="size-4 accent-primary"
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <Field
        id="rejection-note"
        label={value === "other" ? "Reason" : "Note (optional)"}
        hint={`${REJECTION_NOTE_MAX - note.length} characters left`}
        required={value === "other"}
      >
        <Textarea
          id="rejection-note"
          rows={3}
          maxLength={REJECTION_NOTE_MAX}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
