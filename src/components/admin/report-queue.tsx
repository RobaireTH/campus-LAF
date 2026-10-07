"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileWarning } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { friendlyDate } from "@/lib/format";
import { itemRoutes } from "@/lib/items/routes";

import { EmptyQueue } from "./empty-queue";
import type { ReportEntry } from "./types";

type Verdict = "DISMISS" | "REMOVE_ITEM";

export function ReportQueue({ entries }: { entries: ReportEntry[] }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState<string>();
  const [removing, setRemoving] = useState<ReportEntry>();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  function askToRemove(entry: ReportEntry) {
    setRemoving(entry);
    setRemoveOpen(true);
  }

  async function decide(entry: ReportEntry, decision: Verdict) {
    setBusy(entry.id);
    try {
      await sendJson(`/api/admin/reports/${entry.id}`, "PATCH", { decision });
      toast.success(decision === "DISMISS" ? "Report dismissed" : `“${entry.item.title}” was removed`);
      startRefresh(() => router.refresh());
      return true;
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setRemoveOpen(false);
        setAuthRequired(true);
        return false;
      }
      toast.error(cause instanceof Error ? cause.message : "Could not update this report.");
      const stale = cause instanceof ApiRequestError && cause.status === 409;
      if (stale) startRefresh(() => router.refresh());
      return stale;
    } finally {
      setBusy(undefined);
    }
  }

  if (entries.length === 0) return <EmptyQueue icon={FileWarning} title="No reports waiting" />;

  const disabled = refreshing || busy !== undefined;

  return (
    <>
      <div className="space-y-4">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle className="text-body">{entry.item.title}</CardTitle>
              <p className="text-small text-muted-foreground">
                Reported by {entry.reporter.name} on{" "}
                <time dateTime={entry.createdAt} suppressHydrationWarning>{friendlyDate(entry.createdAt)}</time>
              </p>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{entry.reasonLabel}</p>
              {entry.details && <p className="mt-2 text-small text-muted-foreground">{entry.details}</p>}
              <Button asChild variant="link" className="mt-3">
                <Link href={itemRoutes.detail(entry.item.id)}>
                  View item <ExternalLink />
                </Link>
              </Button>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                loading={busy === entry.id}
                disabled={disabled}
                onClick={() => decide(entry, "DISMISS")}
              >
                Dismiss
              </Button>
              <Button variant="danger" disabled={disabled} onClick={() => askToRemove(entry)}>
                Remove item
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove this post?"
        description={`“${removing?.item.title ?? ""}” disappears for everyone, its open claims are cancelled, and every open report about it is closed.`}
        confirmLabel="Remove post"
        tone="danger"
        onConfirm={() => (removing ? decide(removing, "REMOVE_ITEM") : Promise.resolve(false))}
      />
      <SignInDialog
        open={authRequired}
        onOpenChange={setAuthRequired}
        callbackUrl="/admin"
        title="Sign in to open moderation"
        description="This queue is restricted to campus administrators."
      />
    </>
  );
}
