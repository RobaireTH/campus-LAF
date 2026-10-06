"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EditableItem = { title: string; description: string; locationNote?: string | null; eventDate: string };

export function EditItemForm({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<EditableItem>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/items/${id}`).then(async (response) => ({ response, result: await response.json().catch(() => null) })).then(({ response, result }) => {
      if (!active) return;
      if (!response.ok) setError(result?.error ?? "Could not load this item.");
      else setItem(result.item);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), locationNote: form.get("locationNote") || null, dateLostOrFound: form.get("dateLostOrFound") }) });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (response.status === 401) return setAuthRequired(true);
    if (!response.ok) return setError(result?.error ?? "Could not save your changes.");
    router.push(`/items/${id}`);
    router.refresh();
  }

  if (loading) return <div className="h-80 animate-pulse rounded-xl bg-muted" />;
  if (!item) return <p role="alert" className="rounded-lg bg-danger-soft p-4 text-danger-soft-foreground">{error ?? "Item unavailable"}</p>;
  return <><form onSubmit={submit} className="space-y-6"><Field id="title" label="Item name" required><Input id="title" name="title" defaultValue={item.title} minLength={3} maxLength={120} required /></Field><Field id="description" label="Description" required><Textarea id="description" name="description" defaultValue={item.description} minLength={10} maxLength={2000} rows={6} required /></Field><Field id="locationNote" label="Where exactly?"><Input id="locationNote" name="locationNote" defaultValue={item.locationNote ?? ""} maxLength={200} /></Field><Field id="dateLostOrFound" label="Date" required><Input id="dateLostOrFound" name="dateLostOrFound" type="date" defaultValue={new Date(item.eventDate).toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} required /></Field>{error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={saving}>Save changes</Button></div></form><SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl={`/items/${id}/edit`} title="Sign in to edit this post" /></>;
}
