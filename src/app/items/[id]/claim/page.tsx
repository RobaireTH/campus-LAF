import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { ClaimForm } from "@/components/claims/claim-form";
import { ItemSummary } from "@/components/claims/item-summary";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { claimBlocker } from "@/lib/claims/eligibility";
import { claimCopy } from "@/lib/claims/labels";
import { getItem } from "@/lib/items/queries";
import { itemRoutes } from "@/lib/items/routes";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Claim an item · Campus Lost & Found" };

async function ClaimContent({ id }: { id: string }) {
  const item = await getItem(id);
  if (!item) notFound();

  const blocker = claimBlocker(item);
  const copy = claimCopy(item.type);

  return (
    <main className="mx-auto w-full max-w-form px-gutter py-8 lg:py-12">
      <Link
        href={itemRoutes.detail(id)}
        className="mb-6 inline-flex items-center gap-1 text-small font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to item
      </Link>
      <div className="mb-6 space-y-2">
        <h1 className="text-h2">{blocker ? blocker.title : copy.title}</h1>
        <p className="text-muted-foreground">{blocker ? blocker.description : copy.intro}</p>
      </div>
      <div className="mb-7">
        <ItemSummary item={item} />
      </div>
      {blocker ? (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-card">
          <p className="flex items-start gap-2 text-small text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            There is nothing to submit for this post right now.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {blocker.action && (
              <Button asChild>
                <Link href={blocker.action.href}>{blocker.action.label}</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={itemRoutes.detail(id)}>Back to item</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ClaimForm itemId={item.id} itemType={item.type} />
      )}
    </main>
  );
}

export default async function ClaimPage({ params }: PageProps<"/items/[id]/claim">) {
  const { id } = await params;
  return (
    <ProtectedPage
      user={await getShellUser()}
      callbackUrl={itemRoutes.claim(id)}
      requireVerified
      verifyReason="You need a verified student ID before you can submit a claim."
    >
      <ClaimContent id={id} />
    </ProtectedPage>
  );
}
