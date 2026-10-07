import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock3, ContactRound, PackageCheck } from "lucide-react";

import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { claimCopy } from "@/lib/claims/labels";
import { getItem } from "@/lib/items/queries";
import { itemRoutes } from "@/lib/items/routes";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Claim sent · Campus Lost & Found" };

const STEPS = [
  { icon: Check, label: "Claim submitted", active: true },
  { icon: Clock3, label: "Poster reviews your details", active: true },
  { icon: ContactRound, label: "Contact details unlock if approved", active: false },
  { icon: PackageCheck, label: "Meet and complete the handover", active: false },
];

async function ClaimSentContent({ id }: { id: string }) {
  const item = await getItem(id);
  if (!item) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-form flex-col justify-center px-gutter py-10">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <Check className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-h2">Claim sent</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{claimCopy(item.type).sentIntro}</p>
        <p className="mt-1 text-small text-muted-foreground">{item.title}</p>
      </div>
      <ol className="my-8 space-y-1 rounded-xl border bg-card p-5 shadow-card">
        {STEPS.map(({ icon: Icon, label, active }, index) => (
          <li key={label} className={`flex items-center gap-3 rounded-lg p-3 ${active ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`flex size-8 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="text-small font-medium">
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" fullWidth>
          <Link href={itemRoutes.detail(id)}>Back to item</Link>
        </Button>
        <Button asChild fullWidth>
          <Link href={itemRoutes.myClaims}>Track my claims</Link>
        </Button>
      </div>
    </main>
  );
}

export default async function ClaimSentPage({ params }: PageProps<"/items/[id]/claim/sent">) {
  const { id } = await params;
  return (
    <ProtectedPage
      user={await getShellUser()}
      callbackUrl={`${itemRoutes.claim(id)}/sent`}
      requireVerified
      verifyReason="You need a verified student ID before you can submit a claim."
    >
      <ClaimSentContent id={id} />
    </ProtectedPage>
  );
}
