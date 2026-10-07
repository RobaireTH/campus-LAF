"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdCard } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { ProofGallery } from "@/components/claims/proof-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { friendlyDate } from "@/lib/format";

import { EmptyQueue } from "./empty-queue";
import { RejectIdDialog } from "./reject-id-dialog";
import type { VerificationEntry } from "./types";

type Verdict = { decision: "APPROVE" } | { decision: "REJECT"; reason: string };

export function VerificationQueue({ entries }: { entries: VerificationEntry[] }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState<string>();
  const [rejecting, setRejecting] = useState<VerificationEntry>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  function askToReject(entry: VerificationEntry) {
    setRejecting(entry);
    setRejectOpen(true);
  }

  async function decide(entry: VerificationEntry, verdict: Verdict) {
    setBusy(entry.id);
    try {
      await sendJson(`/api/admin/verifications/${entry.id}`, "PATCH", verdict);
      toast.success(verdict.decision === "APPROVE" ? `${entry.user.name} is verified` : `${entry.user.name}'s ID was rejected`);
      startRefresh(() => router.refresh());
      return true;
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setRejectOpen(false);
        setAuthRequired(true);
        return false;
      }
      toast.error(cause instanceof Error ? cause.message : "Could not update this ID.");
      const stale = cause instanceof ApiRequestError && cause.status === 409;
      if (stale) startRefresh(() => router.refresh());
      return stale;
    } finally {
      setBusy(undefined);
    }
  }

  if (entries.length === 0) return <EmptyQueue icon={IdCard} title="No IDs waiting" />;

  const disabled = refreshing || busy !== undefined;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle className="text-body">{entry.user.name}</CardTitle>
              <p className="text-small text-muted-foreground">{entry.user.email}</p>
              {entry.submittedAt && (
                <p className="text-caption text-muted-foreground">
                  Submitted <time dateTime={entry.submittedAt} suppressHydrationWarning>{friendlyDate(entry.submittedAt)}</time>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ProofGallery
                media={[{ id: entry.id, url: entry.documentUrl, type: "IMAGE" }]}
                label={`ID photo of ${entry.user.name}`}
                shape="card"
              />
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled={disabled} onClick={() => askToReject(entry)}>
                Reject
              </Button>
              <Button loading={busy === entry.id} disabled={disabled} onClick={() => decide(entry, { decision: "APPROVE" })}>
                Approve
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <RejectIdDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        name={rejecting?.user.name ?? ""}
        onReject={(reason) => (rejecting ? decide(rejecting, { decision: "REJECT", reason }) : Promise.resolve(false))}
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
