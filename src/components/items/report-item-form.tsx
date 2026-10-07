"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import type { Option } from "@/lib/items/types";
import { AuthRequiredError, uploadFile } from "@/lib/uploads/client";

interface Props {
  categories: Option[];
  locations: Option[];
}

export function ReportItemForm({ categories, locations }: Props) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const uploaded = useRef(new Map<File, string>());
  const [type, setType] = useState("FOUND");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [authRequired, setAuthRequired] = useState(false);

  async function upload(file: File) {
    const known = uploaded.current.get(file);
    if (known) return known;
    const key = await uploadFile(file, "item");
    uploaded.current.set(file, key);
    return key;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: Record<string, string[]> = {};
    if (!categoryId) missing.categoryId = ["Choose a category."];
    if (!locationId) missing.locationId = ["Choose a campus location."];
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      return setError("Choose a category and campus location.");
    }
    setLoading(true);
    setError(undefined);
    setFieldErrors({});
    try {
      const form = new FormData(event.currentTarget);
      const mediaKeys = await Promise.all(photos.map(upload));
      const { item } = await sendJson<{ item: { id: string } }>(
        "/api/items",
        "POST",
        {
          type,
          title: form.get("title"),
          description: form.get("description"),
          categoryId,
          locationId,
          locationNote: form.get("locationNote") || undefined,
          dateLostOrFound: form.get("dateLostOrFound"),
          mediaKeys,
        },
        { "Idempotency-Key": idempotencyKey },
      );
      router.push(`/items/${item.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof AuthRequiredError || (cause instanceof ApiRequestError && cause.status === 401)) setAuthRequired(true);
      else {
        if (cause instanceof ApiRequestError) setFieldErrors(cause.fields);
        setError(cause instanceof Error ? cause.message : "Could not publish this report.");
      }
    } finally {
      setLoading(false);
    }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <><form onSubmit={submit} className="space-y-7">
      <fieldset className="space-y-2">
        <legend className="text-small font-semibold">What happened?</legend>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {["LOST", "FOUND"].map((value) => (
            <button key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value} className="h-11 rounded-md text-small font-semibold transition-colors aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-card">
              {value === "LOST" ? "I lost something" : "I found something"}
            </button>
          ))}
        </div>
      </fieldset>
      <Field id="title" label="Item name" hint="Use a short name people can scan quickly." error={fieldError("title")} required><Input id="title" name="title" minLength={3} maxLength={120} placeholder="Black Jansport backpack" required /></Field>
      <Field id="description" label="Description" hint="Do not reveal every identifying detail." error={fieldError("description")} required><Textarea id="description" name="description" minLength={10} maxLength={2000} placeholder="Colour, brand, condition, and anything visible..." required /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="Category" error={fieldError("categoryId")} required><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger id="category"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent>{categories.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field id="location" label="Campus location" error={fieldError("locationId")} required><Select value={locationId} onValueChange={setLocationId}><SelectTrigger id="location"><SelectValue placeholder="Choose location" /></SelectTrigger><SelectContent>{locations.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      <Field id="locationNote" label="Where exactly?" hint="A landmark or room makes matching easier." error={fieldError("locationNote")}><Input id="locationNote" name="locationNote" maxLength={200} placeholder="Near the library entrance" /></Field>
      <Field id="dateLostOrFound" label={type === "LOST" ? "Date lost" : "Date found"} error={fieldError("dateLostOrFound")} required><Input id="dateLostOrFound" name="dateLostOrFound" type="date" max={new Date().toISOString().slice(0, 10)} required /></Field>
      <Field id="photos" label="Photos" hint="Add up to five clear photos." error={fieldError("mediaKeys")}><PhotoPicker id="photos" value={photos} onChange={setPhotos} maxFiles={5} accept="image/jpeg,image/png,image/webp" capture="environment" /></Field>
      <div className="flex gap-3 rounded-lg bg-accent p-4 text-small text-accent-foreground"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /><p>Contact details stay private until a claim is approved.</p></div>
      {error && <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground"><AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" size="lg" loading={loading}>{type === "LOST" ? "Publish lost item" : "Publish found item"}</Button></div>
    </form><SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl="/report" title="Sign in to report an item" description="We need an account before photos can be uploaded or a campus report can be published." /></>
  );
}
