"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { itemRoutes } from "@/lib/items/routes";

type Action = "COMPLETE" | "CANCEL";

const SUCCESS: Record<Action, string> = {
  COMPLETE: "Marked as returned. Thank you!",
  CANCEL: "Handover cancelled. The post is open for claims again.",
};

export function HandoverActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Action>();
  const [authRequired, setAuthRequired] = useState(false);

  async function update(action: Action) {
    try {
      await sendJson(`/api/claims/${claimId}/handover`, "PATCH", { action });
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setDialog(undefined);
        setAuthRequired(true);
        return false;
      }
      toast.error(cause instanceof Error ? cause.message : "Could not update the handover.");
      const stale = cause instanceof ApiRequestError && cause.status === 409;
      if (stale) router.refresh();
      return stale;
    }
    toast.success(SUCCESS[action]);
    router.refresh();
    return true;
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => setDialog("CANCEL")}>
          Cancel handover
        </Button>
        <Button onClick={() => setDialog("COMPLETE")}>Mark as returned</Button>
      </div>

      <ConfirmDialog
        open={dialog === "COMPLETE"}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title="Mark this item as returned?"
        description="This closes the post as resolved for both of you. Only do this once the item has changed hands."
        confirmLabel="Yes, it was returned"
        cancelLabel="Not yet"
        onConfirm={() => update("COMPLETE")}
      />
      <ConfirmDialog
        open={dialog === "CANCEL"}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title="Cancel this handover?"
        description="The claim is cancelled and the post opens for claims again. This can't be undone."
        confirmLabel="Cancel handover"
        cancelLabel="Keep handover"
        tone="danger"
        onConfirm={() => update("CANCEL")}
      />
      <SignInDialog
        open={authRequired}
        onOpenChange={setAuthRequired}
        callbackUrl={itemRoutes.handover(claimId)}
        title="Sign in to continue the handover"
        description="Contact details and handover codes are only shown to the people involved."
      />
    </>
  );
}
