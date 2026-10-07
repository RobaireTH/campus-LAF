"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import type { Option } from "@/lib/items/types";

export interface EditableItem {
  id: string;
  title: string;
  description: string;
  locationNote: string | null;
  date: string;
  categoryId: string;
  locationId: string;
}

interface Props {
  item: EditableItem;
  categories: Option[];
  locations: Option[];
}

export function EditItemForm({ item, categories, locations }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [locationId, setLocationId] = useState(item.locationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [authRequired, setAuthRequired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await sendJson(`/api/items/${item.id}`, "PATCH", {
        title: form.get("title"),
        description: form.get("description"),
        categoryId,
        locationId,
        locationNote: form.get("locationNote") || null,
        dateLostOrFound: form.get("dateLostOrFound"),
      });
      router.push(`/items/${item.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) setAuthRequired(true);
      else {
        if (cause instanceof ApiRequestError) setFieldErrors(cause.fields);
        setError(cause instanceof Error ? cause.message : "Could not save your changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <Field id="title" label="Item name" error={fieldError("title")} required><Input id="title" name="title" defaultValue={item.title} minLength={3} maxLength={120} required /></Field>
        <Field id="description" label="Description" error={fieldError("description")} required><Textarea id="description" name="description" defaultValue={item.description} minLength={10} maxLength={2000} rows={6} required /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="category" label="Category" error={fieldError("categoryId")} required><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger id="category"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent>{categories.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field id="location" label="Campus location" error={fieldError("locationId")} required><Select value={locationId} onValueChange={setLocationId}><SelectTrigger id="location"><SelectValue placeholder="Choose location" /></SelectTrigger><SelectContent>{locations.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <Field id="locationNote" label="Where exactly?" error={fieldError("locationNote")}><Input id="locationNote" name="locationNote" defaultValue={item.locationNote ?? ""} maxLength={200} /></Field>
        <Field id="dateLostOrFound" label="Date" error={fieldError("dateLostOrFound")} required><Input id="dateLostOrFound" name="dateLostOrFound" type="date" defaultValue={new Date(item.date).toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} required /></Field>
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={saving}>Save changes</Button></div>
      </form>
      <SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl={`/items/${item.id}/edit`} title="Sign in to edit this post" />
    </>
  );
}
