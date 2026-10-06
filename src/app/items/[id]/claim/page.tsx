"use client";

import { FormEvent, use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Textarea } from "@/components/ui/textarea";
import { AuthRequiredError, uploadFile } from "@/lib/uploads/client";

export default function ClaimFormPage({ params }: PageProps<"/items/[id]/claim">) {
  const { id } = use(params);
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return setError("Confirm that this item belongs to you.");
    setLoading(true);
    setError(undefined);
    try {
      const mediaKeys = await Promise.all(files.map((file) => uploadFile(file, "claim")));
      const response = await fetch(`/api/items/${id}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, mediaKeys }),
      });
      const result = await response.json().catch(() => null);
      if (response.status === 401) throw new AuthRequiredError("Sign in to submit a claim.");
      if (!response.ok) throw new Error(result?.error ?? "Could not submit your claim.");
      router.push(`/items/${id}/claim/sent?claim=${result.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof AuthRequiredError) setAuthRequired(true);
      else setError(cause instanceof Error ? cause.message : "Could not submit your claim.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-form px-gutter py-8 lg:py-12">
      <Link href={`/items/${id}`} className="mb-6 inline-flex items-center gap-1 text-small font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden />Back to item</Link>
      <div className="mb-7 space-y-2"><h1 className="text-h2">Claim this item</h1><p className="text-muted-foreground">Share details that only the real owner would know.</p></div>
      <form onSubmit={submit} className="space-y-6">
        <Field id="proof" label="Ownership details" hint="Mention private details such as a scratch, sticker, contents, receipt, or lock screen." required><Textarea id="proof" value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={2000} rows={6} placeholder="Describe what makes this item yours..." required /></Field>
        <Field id="claim-media" label="Proof media" hint="A receipt, matching accessory, or earlier photo can help."><PhotoPicker id="claim-media" value={files} onChange={setFiles} maxFiles={5} accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" /></Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4"><Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} aria-label="Confirm ownership" /><span className="text-small">I confirm this item belongs to me. I understand false claims may suspend my account.</span></label>
        <div className="flex gap-3 rounded-lg bg-muted p-4 text-small text-muted-foreground"><LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden /><p>Your contact details remain private until the poster approves this claim.</p></div>
        {error && <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground"><AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={loading}>Submit claim</Button>
      </form><SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl={`/items/${id}/claim`} title="Sign in to claim this item" description="Claims are tied to verified campus accounts so posters can review them safely." />
    </main>
  );
}
