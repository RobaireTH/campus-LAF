"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";

type Notification = { id: string; title: string; body: string; href?: string; readAt?: string | null; createdAt: string };

export function NotificationList() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/notifications").then(async (response) => ({ response, result: await response.json().catch(() => null) })).then(({ response, result }) => {
      if (!active) return;
      if (response.status === 401) setAuthRequired(true);
      else if (!response.ok) setError(result?.error ?? "Notifications are unavailable.");
      else setItems(result.notifications ?? []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markAllRead() {
    const response = await fetch("/api/me/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (response.status === 401) return setAuthRequired(true);
    if (response.ok) setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    else setError("Could not mark notifications as read.");
  }

  const dialog = <SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl="/notifications" title="Sign in to view notifications" description="Claim decisions and handover updates are private to your account." />;
  if (loading) return <><div className="h-52 animate-pulse rounded-xl bg-muted" />{dialog}</>;
  if (error) return <><p role="alert" className="rounded-lg bg-danger-soft p-4 text-danger-soft-foreground">{error}</p>{dialog}</>;
  if (items.length === 0) return <><div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center"><Bell className="mb-3 size-9 text-muted-foreground" aria-hidden /><h2 className="text-h3">No notifications</h2><p className="mt-1 text-small text-muted-foreground">Claim and handover updates will appear here.</p></div>{dialog}</>;
  return <><div className="space-y-4"><div className="flex justify-end"><Button variant="ghost" size="sm" onClick={markAllRead}><CheckCheck />Mark all read</Button></div><div className="overflow-hidden rounded-xl border bg-card shadow-card">{items.map((item) => <Link key={item.id} href={item.href ?? "/notifications"} className={`block border-b p-4 last:border-0 hover:bg-muted/60 ${item.readAt ? "" : "bg-primary/5"}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-small text-muted-foreground">{item.body}</p></div>{!item.readAt && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}</div><p className="mt-2 text-caption text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></Link>)}</div></div>{dialog}</>;
}
