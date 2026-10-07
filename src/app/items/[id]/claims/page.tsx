import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Inbox, ShieldCheck, UserRound } from "lucide-react";

import { ClaimActions } from "@/components/claims/claim-actions";
import { ItemSummary } from "@/components/claims/item-summary";
import { ProofGallery } from "@/components/claims/proof-gallery";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { claimCopy, claimProgress } from "@/lib/claims/labels";
import { listItemClaims } from "@/lib/claims/service";
import { friendlyDate } from "@/lib/format";
import { getItem } from "@/lib/items/queries";
import { itemRoutes } from "@/lib/items/routes";
import type { ItemStatus } from "@/lib/items/types";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Review claims · Campus Lost & Found" };

const CLOSED_NOTICE: Record<Exclude<ItemStatus, "OPEN">, string> = {
  CLAIMED: "You approved a claim. Finish the handover from the approved claim below.",
  RESOLVED: "This item was returned, so no more claims can be decided.",
  REMOVED: "This post was removed, so its claims are closed.",
};

async function ReviewContent({ id }: { id: string }) {
  const item = await getItem(id);
  if (!item?.isOwner) notFound();
  const claims = await listItemClaims(await requireUser(), id);

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8 lg:py-12">
      <Link
        href={itemRoutes.detail(id)}
        className="mb-6 inline-flex items-center gap-1 text-small font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to item
      </Link>
      <div className="mb-6">
        <h1 className="text-h2">Review claims</h1>
        <p className="mt-1 text-muted-foreground">{claimCopy(item.type).reviewIntro}</p>
      </div>
      <div className="mb-6">
        <ItemSummary item={item} />
      </div>
      {item.status !== "OPEN" && (
        <p className="mb-5 rounded-lg bg-muted p-4 text-small text-muted-foreground">{CLOSED_NOTICE[item.status]}</p>
      )}
      {claims.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <Inbox className="mb-3 size-9 text-muted-foreground" aria-hidden />
          <h2 className="text-h3">No claims yet</h2>
          <p className="mt-1 text-small text-muted-foreground">New claims will appear here for review.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {claims.map((claim) => {
            const progress = claimProgress({ status: claim.status, itemStatus: item.status }, "poster");
            const decidable = claim.status === "PENDING" && item.status === "OPEN";
            return (
              <li key={claim.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <UserRound className="size-5" aria-hidden />
                      </span>
                      <div>
                        <CardTitle className="text-body">{claim.claimant.name}</CardTitle>
                        <p className="flex items-center gap-1 text-caption text-muted-foreground">
                          {claim.claimant.verified && <ShieldCheck className="size-3.5 text-success" aria-hidden />}
                          {claim.claimant.verified ? "Verified student · " : ""}Submitted {friendlyDate(claim.createdAt)}
                        </p>
                      </div>
                    </div>
                    <CardAction>
                      <Badge variant={progress.tone}>{progress.label}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-line rounded-lg bg-muted p-4 text-small">{claim.description}</p>
                    <ProofGallery media={claim.media} label="Proof" />
                  </CardContent>
                  {decidable && (
                    <CardFooter className="justify-end">
                      <ClaimActions claimId={claim.id} itemId={id} claimantName={claim.claimant.name} />
                    </CardFooter>
                  )}
                  {claim.status === "APPROVED" && item.status === "CLAIMED" && (
                    <CardFooter className="justify-end">
                      <Button asChild>
                        <Link href={itemRoutes.handover(claim.id)}>Contact and handover</Link>
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default async function ReviewClaimsPage({ params }: PageProps<"/items/[id]/claims">) {
  const { id } = await params;
  return (
    <ProtectedPage user={await getShellUser()} callbackUrl={itemRoutes.claims(id)}>
      <ReviewContent id={id} />
    </ProtectedPage>
  );
}
