"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Inbox, PackageCheck, Plus, Search } from "lucide-react";

import { Badge, ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyDate } from "@/lib/format";

type Post = { id: string; title: string; type: "LOST" | "FOUND"; status: "OPEN" | "CLAIMED" | "RESOLVED"; eventDate: string; claimCount: number };
type Claim = { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string; item: { id: string; title: string; type: "LOST" | "FOUND" } };

export function DashboardView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [postError, setPostError] = useState<string>();
  const [claimError, setClaimError] = useState<string>();

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/me/items").then(async (response) => { if (!response.ok) throw new Error(response.status === 401 ? "Log in to view your posts." : "Posts are unavailable right now."); setPosts((await response.json()).items ?? []); }),
      fetch("/api/me/claims").then(async (response) => { if (!response.ok) throw new Error(response.status === 401 ? "Log in to view your claims." : "Claims are unavailable right now."); setClaims((await response.json()).claims ?? []); }),
    ]).then((results) => {
      if (results[0].status === "rejected") setPostError(results[0].reason.message);
      if (results[1].status === "rejected") setClaimError(results[1].reason.message);
      setLoading(false);
    });
  }, []);

  const waiting = useMemo(() => posts.reduce((sum, post) => sum + post.claimCount, 0), [posts]);
  const resolved = useMemo(() => posts.filter((post) => post.status === "RESOLVED").length, [posts]);

  return (
    <div className="space-y-7">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={ClipboardList} label="Active posts" value={posts.filter((post) => post.status !== "RESOLVED").length} />
        <Metric icon={Inbox} label="Claims received" value={waiting} />
        <Metric icon={PackageCheck} label="Items returned" value={resolved} />
      </div>
      <Tabs defaultValue="posts">
        <TabsList className="w-full sm:w-fit"><TabsTrigger value="posts">My posts</TabsTrigger><TabsTrigger value="claims">My claims</TabsTrigger></TabsList>
        <TabsContent value="posts"><RecordList loading={loading} error={postError} emptyTitle="No posts yet" emptyCopy="Report a lost or found item to see it here." actionHref="/report" actionLabel="Report an item">{posts.map((post) => <Link key={post.id} href={`/items/${post.id}`} className="flex items-center gap-4 border-b px-4 py-4 last:border-0 hover:bg-muted/60"><div className="min-w-0 flex-1"><div className="mb-1.5 flex flex-wrap items-center gap-2"><ItemTypeBadge type={post.type} /><ItemStatusBadge status={post.status} /></div><p className="truncate font-semibold">{post.title}</p><p className="text-small text-muted-foreground">{friendlyDate(post.eventDate)} · {post.claimCount} {post.claimCount === 1 ? "claim" : "claims"}</p></div><ArrowRight className="size-5 text-muted-foreground" aria-hidden /></Link>)}</RecordList></TabsContent>
        <TabsContent value="claims"><RecordList loading={loading} error={claimError} emptyTitle="No claims yet" emptyCopy="When you claim an item, its progress appears here." actionHref="/" actionLabel="Browse items">{claims.map((claim) => <Link key={claim.id} href={`/items/${claim.item.id}`} className="flex items-center gap-4 border-b px-4 py-4 last:border-0 hover:bg-muted/60"><div className="min-w-0 flex-1"><div className="mb-1.5 flex flex-wrap items-center gap-2"><ItemTypeBadge type={claim.item.type} /><Badge variant={claim.status === "APPROVED" ? "success" : claim.status === "REJECTED" ? "danger" : "warning"}>{claim.status.toLowerCase()}</Badge></div><p className="truncate font-semibold">{claim.item.title}</p><p className="text-small text-muted-foreground">Submitted {friendlyDate(claim.createdAt)}</p></div><ArrowRight className="size-5 text-muted-foreground" aria-hidden /></Link>)}</RecordList></TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number }) {
  return <Card className="gap-2 py-4"><CardContent className="flex items-center gap-3 px-4"><span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span><div><p className="text-h3">{value}</p><p className="text-small text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function RecordList({ loading, error, emptyTitle, emptyCopy, actionHref, actionLabel, children }: { loading: boolean; error?: string; emptyTitle: string; emptyCopy: string; actionHref: string; actionLabel: string; children: React.ReactNode }) {
  const empty = Array.isArray(children) && children.length === 0;
  if (loading) return <div className="h-44 animate-pulse rounded-xl bg-muted" />;
  if (error) return <Empty icon={Inbox} title={error} copy="Try again after the backend endpoint is available." href="/login" label="Log in" />;
  if (empty) return <Empty icon={actionHref === "/report" ? Plus : Search} title={emptyTitle} copy={emptyCopy} href={actionHref} label={actionLabel} />;
  return <div className="overflow-hidden rounded-xl border bg-card shadow-card">{children}</div>;
}

function Empty({ icon: Icon, title, copy, href, label }: { icon: typeof Inbox; title: string; copy: string; href: string; label: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-7 text-center"><Icon className="mb-3 size-8 text-muted-foreground" aria-hidden /><h2 className="text-h3">{title}</h2><p className="mt-1 max-w-sm text-small text-muted-foreground">{copy}</p><Button asChild className="mt-5"><Link href={href}>{label}</Link></Button></div>;
}
