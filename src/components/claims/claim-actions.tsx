"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { itemRoutes } from "@/lib/items/routes";

type Decision = "APPROVE" | "REJECT";

interface ClaimActionsProps {
  claimId: string;
  itemId: string;
  claimantName: string;
}

export function ClaimActions({ claimId, itemId, claimantName }: ClaimActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Decision>();
  const [authRequired, setAuthRequired] = useState(false);

  async function decide(decision: Decision) {
    try {
      await sendJson(`/api/claims/${claimId}`, "PATCH", { decision });
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setDialog(undefined);
        setAuthRequired(true);
        return false;
      }
      toast.error(cause instanceof Error ? cause.message : "Could not update this claim.");
      const stale = cause instanceof ApiRequestError && cause.status === 409;
      if (stale) router.refresh();
      return stale;
    }
    if (decision === "APPROVE") {
      toast.success("Claim approved. Contact details are ready.");
      router.push(itemRoutes.handover(claimId));
    } else {
      toast.success("Claim rejected");
      router.refresh();
    }
    return true;
  }

  return (
    <>
      <Button variant="outline" onClick={() => setDialog("REJECT")}>
        Reject
      </Button>
      <Button onClick={() => setDialog("APPROVE")}>Approve claim</Button>

      <ConfirmDialog
        open={dialog === "APPROVE"}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={`Approve ${claimantName}'s claim?`}
        description="You and they will see each other's phone number and a handover code, and every other pending claim on this post will be rejected."
        confirmLabel="Approve claim"
        onConfirm={() => decide("APPROVE")}
      />
      <ConfirmDialog
        open={dialog === "REJECT"}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={`Reject ${claimantName}'s claim?`}
        description="They will see that the claim was not approved. You can still approve another claim."
        confirmLabel="Reject claim"
        tone="danger"
        onConfirm={() => decide("REJECT")}
      />
      <SignInDialog
        open={authRequired}
        onOpenChange={setAuthRequired}
        callbackUrl={itemRoutes.claims(itemId)}
        title="Sign in to review claims"
        description="Ownership evidence is private and only visible to the person who posted the item."
      />
    </>
  );
}
