"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Flag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

/** Owner-only delete, while the item is OPEN. */
export function DeleteItemButton({ itemId, claimCount }: { itemId: string; claimCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft">
          <Trash2 /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this post?</DialogTitle>
          <DialogDescription>
            {claimCount > 0
              ? `The ${claimCount} open ${claimCount === 1 ? "claim" : "claims"} will be closed. This can't be undone.`
              : "It will disappear from search. This can't be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep it</Button>
          </DialogClose>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
              setBusy(false);
              if (!response.ok) {
                toast.error((await response.json().catch(() => null))?.error ?? "Could not delete this post");
                return;
              }
              toast.success("Post deleted");
              router.push("/");
              router.refresh();
            }}
          >
            Delete post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const reasons = [
  { value: "spam", label: "Spam or advertising" },
  { value: "fake", label: "Looks fake or misleading" },
  { value: "personal", label: "Shows someone's private details" },
  { value: "offensive", label: "Offensive content" },
  { value: "other", label: "Something else" },
];

/** "Report" link for inappropriate posts. MVP stub: flags for admin review (SOF-43 later). */
export function ReportPostButton({ itemId }: { itemId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string>();
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-muted-foreground">
          <Flag /> Report this post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this post</DialogTitle>
          <DialogDescription>An admin will take a look. The poster won&apos;t see who reported it.</DialogDescription>
        </DialogHeader>
        <Field id="report-reason" label="What's wrong?" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="report-reason">
              <SelectValue placeholder="Pick a reason" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="report-details" label="Anything else? (optional)">
          <Textarea id="report-details" rows={3} value={details} onChange={(event) => setDetails(event.target.value)} />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!reason}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const response = await fetch(`/api/items/${itemId}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details: details.trim() || undefined }) });
              setBusy(false);
              if (!response.ok) {
                toast.error((await response.json().catch(() => null))?.error ?? "Could not send this report");
                return;
              }
              setOpen(false);
              setReason(undefined);
              setDetails("");
              toast.success("Thanks — an admin will review this post");
            }}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
