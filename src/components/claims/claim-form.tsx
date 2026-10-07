"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { claimCopy } from "@/lib/claims/labels";
import { itemRoutes } from "@/lib/items/routes";
import type { ItemType } from "@/lib/items/types";
import { AuthRequiredError, uploadFile } from "@/lib/uploads/client";

interface ClaimFormProps {
  itemId: string;
  itemType: ItemType;
}

export function ClaimForm({ itemId, itemType }: ClaimFormProps) {
  const router = useRouter();
  const copy = claimCopy(itemType);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const uploaded = useRef(new Map<File, string>());
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [authRequired, setAuthRequired] = useState(false);

  async function upload(file: File) {
    const known = uploaded.current.get(file);
    if (known) return known;
    const key = await uploadFile(file, "claim");
    uploaded.current.set(file, key);
    return key;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return setError("Tick the confirmation box to continue.");
    setLoading(true);
    setError(undefined);
    setFieldErrors({});
    try {
      const mediaKeys = await Promise.all(files.map(upload));
      const claim = await sendJson<{ id: string }>(
        `/api/items/${itemId}/claims`,
        "POST",
        { description, mediaKeys },
        { "Idempotency-Key": idempotencyKey },
      );
      router.push(`${itemRoutes.claim(itemId)}/sent?claim=${claim.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof AuthRequiredError || (cause instanceof ApiRequestError && cause.status === 401)) {
        setAuthRequired(true);
      } else {
        if (cause instanceof ApiRequestError) setFieldErrors(cause.fields);
        setError(cause instanceof Error ? cause.message : "Could not submit your claim.");
      }
    } finally {
      setLoading(false);
    }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <Field
          id="proof"
          label={copy.detailsLabel}
          hint={copy.detailsHint}
          error={fieldError("description")}
          required
        >
          <Textarea
            id="proof"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength={10}
            maxLength={2000}
            rows={6}
            placeholder={copy.detailsPlaceholder}
            required
          />
        </Field>
        <Field id="claim-media" label={copy.mediaLabel} hint={copy.mediaHint} error={fieldError("mediaKeys")}>
          <PhotoPicker
            id="claim-media"
            value={files}
            onChange={setFiles}
            maxFiles={5}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(value) => setConfirmed(value === true)}
            aria-label="Confirm your claim is true"
          />
          <span className="text-small">{copy.confirmation}</span>
        </label>
        <div className="flex gap-3 rounded-lg bg-muted p-4 text-small text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>Your contact details remain private until the poster approves this claim.</p>
        </div>
        {error && (
          <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Submit claim
        </Button>
      </form>
      <SignInDialog
        open={authRequired}
        onOpenChange={setAuthRequired}
        callbackUrl={itemRoutes.claim(itemId)}
        title="Sign in to submit a claim"
        description="Claims are tied to verified campus accounts so posters can review them safely."
      />
    </>
  );
}
