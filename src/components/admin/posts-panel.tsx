"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Badge, ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { friendlyDate } from "@/lib/format";
import { itemRoutes } from "@/lib/items/routes";

import { EmptyQueue } from "./empty-queue";
import type { AdminPost, AdminPostsPage } from "./types";

const ANY = "ANY";

const TYPE_OPTIONS = [
  { value: ANY, label: "Lost and found" },
  { value: "LOST", label: "Lost" },
  { value: "FOUND", label: "Found" },
];

const STATUS_OPTIONS = [
  { value: ANY, label: "Any status" },
  { value: "OPEN", label: "Open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REMOVED", label: "Removed" },
];

interface Filters {
  q: string;
  type: string;
  status: string;
}

function queryOf(filters: Filters, cursor?: string) {
  const query = new URLSearchParams();
  if (filters.q.trim()) query.set("q", filters.q.trim());
  if (filters.type !== ANY) query.set("type", filters.type);
  if (filters.status !== ANY) query.set("status", filters.status);
  if (cursor) query.set("cursor", cursor);
  return query.toString();
}

export function PostsPanel({ initial }: { initial: AdminPostsPage }) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const latest = useRef(0);
  const [page, setPage] = useState(initial);
  const [filters, setFilters] = useState<Filters>({ q: "", type: ANY, status: ANY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [removing, setRemoving] = useState<AdminPost>();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  async function load(next: Filters, cursor?: string) {
    const ticket = ++latest.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await sendJson<AdminPostsPage>(`/api/admin/items?${queryOf(next, cursor)}`, "GET");
      if (ticket !== latest.current) return;
      setPage((current) => (cursor ? { ...result, items: [...current.items, ...result.items] } : result));
    } catch (cause) {
      if (ticket !== latest.current) return;
      if (cause instanceof ApiRequestError && cause.status === 401) setAuthRequired(true);
      else setError(cause instanceof Error ? cause.message : "Could not load posts.");
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  function change(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (!("q" in patch)) load(next);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load(filters);
  }

  function askToRemove(post: AdminPost) {
    setRemoving(post);
    setRemoveOpen(true);
  }

  async function remove(post: AdminPost) {
    try {
      await sendJson(`/api/admin/items/${post.id}/remove`, "PATCH");
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setRemoveOpen(false);
        setAuthRequired(true);
        return false;
      }
      toast.error(cause instanceof Error ? cause.message : "Could not remove this post.");
      return false;
    }
    setPage((current) => ({
      ...current,
      items: current.items.map((entry) => (entry.id === post.id ? { ...entry, status: "REMOVED", openReports: 0 } : entry)),
    }));
    toast.success(`“${post.title}” was removed`);
    startRefresh(() => router.refresh());
    return true;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <Input
          type="search"
          aria-label="Search posts"
          placeholder="Search by title or description"
          maxLength={100}
          value={filters.q}
          onChange={(event) => change({ q: event.target.value })}
        />
        <Select value={filters.type} onValueChange={(type) => change({ type })}>
          <SelectTrigger aria-label="Filter by type" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(status) => change({ status })}>
          <SelectTrigger aria-label="Filter by status" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary" loading={loading && page.items.length === 0}>
          <Search />
          Search
        </Button>
      </form>

      <p className="text-small text-muted-foreground" aria-live="polite">
        {page.total} {page.total === 1 ? "post" : "posts"}
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">
          {error}
        </p>
      )}

      {page.items.length === 0 && !loading ? (
        <EmptyQueue icon={Search} title="No posts match" copy="Try a different search or filter." />
      ) : (
        <ul className="overflow-hidden rounded-xl border bg-card shadow-card" aria-busy={loading}>
          {page.items.map((post) => (
            <PostRow key={post.id} post={post} onRemove={askToRemove} />
          ))}
        </ul>
      )}

      {page.nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" loading={loading} onClick={() => load(filters, page.nextCursor ?? undefined)}>
            Load more
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove this post?"
        description={`“${removing?.title ?? ""}” disappears for everyone, its open claims are cancelled, and every open report about it is closed.`}
        confirmLabel="Remove post"
        tone="danger"
        onConfirm={() => (removing ? remove(removing) : Promise.resolve(false))}
      />
      <SignInDialog
        open={authRequired}
        onOpenChange={setAuthRequired}
        callbackUrl="/admin"
        title="Sign in to open moderation"
        description="This queue is restricted to campus administrators."
      />
    </div>
  );
}

function PostRow({ post, onRemove }: { post: AdminPost; onRemove: (post: AdminPost) => void }) {
  const removed = post.status === "REMOVED";

  return (
    <li className="flex flex-wrap items-center gap-3 border-b px-4 py-4 last:border-0">
      <div className="min-w-0 flex-1 basis-56">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <ItemTypeBadge type={post.type} />
          <ItemStatusBadge status={post.status} />
          {post.openReports > 0 && (
            <Badge variant="danger">
              {post.openReports} open {post.openReports === 1 ? "report" : "reports"}
            </Badge>
          )}
        </div>
        {removed ? (
          <p className="truncate font-semibold text-muted-foreground">{post.title}</p>
        ) : (
          <Link href={itemRoutes.detail(post.id)} className="block truncate font-semibold hover:underline">
            {post.title}
          </Link>
        )}
        <p className="text-small text-muted-foreground">
          {post.poster.name ?? "Unnamed"} · {post.poster.email} ·{" "}
          <time dateTime={post.createdAt} suppressHydrationWarning>{friendlyDate(post.createdAt)}</time> · {post.claimCount}{" "}
          {post.claimCount === 1 ? "claim" : "claims"}
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={removed} onClick={() => onRemove(post)}>
        <Trash2 />
        {removed ? "Removed" : "Remove"}
      </Button>
    </li>
  );
}
