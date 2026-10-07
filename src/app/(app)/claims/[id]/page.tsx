import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleSlash, Clock3, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { CopyCodeButton } from "@/components/claims/copy-code-button";
import { HandoverActions } from "@/components/claims/handover-actions";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getHandover } from "@/lib/claims/service";
import { ApiError } from "@/lib/http/errors";
import { itemRoutes } from "@/lib/items/routes";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Contact and handover · Campus Lost & Found" };

const ROLE_LABEL = { POSTER: "Posted this item", CLAIMANT: "Sent the claim" } as const;

async function loadHandover(user: CurrentUser, id: string) {
  try {
    return await getHandover(user, id);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 409) return null;
    if (error.status === 403 || error.status === 404) notFound();
    throw error;
  }
}

function Outcome({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof CheckCircle2;
  tone: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-16 text-center">
      <Icon className={`mx-auto size-14 ${tone}`} aria-hidden />
      <h1 className="mt-4 text-h2">{title}</h1>
      <p className="mt-2 text-muted-foreground">{children}</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Return to dashboard</Link>
      </Button>
    </div>
  );
}

async function HandoverContent({ id }: { id: string }) {
  const handover = await loadHandover(await requireUser(), id);

  if (!handover) {
    return (
      <PageContainer width="form">
        <Outcome icon={Clock3} tone="text-warning" title="Not available yet">
          Contact details are shared once the poster approves a claim.
        </Outcome>
      </PageContainer>
    );
  }
  if (handover.status === "CANCELLED") {
    return (
      <PageContainer width="form">
        <Outcome icon={CircleSlash} tone="text-muted-foreground" title="Handover cancelled">
          This handover was cancelled, so the contact details are no longer shared.
        </Outcome>
      </PageContainer>
    );
  }
  if (handover.status === "RESOLVED") {
    return (
      <PageContainer width="form">
        <Outcome icon={CheckCircle2} tone="text-success" title="Item returned">
          {handover.item.title} is back with its owner. This handover is complete.
        </Outcome>
      </PageContainer>
    );
  }

  const { contact, code } = handover;
  return (
    <PageContainer width="form" title="Contact and handover" description={handover.item.title}>
      <div className="space-y-5">
        {contact && (
          <section aria-labelledby="contact-heading" className="rounded-xl border bg-card p-5 shadow-card">
            <p className="text-small text-muted-foreground">{ROLE_LABEL[contact.role]}</p>
            <h2 id="contact-heading" className="text-h3">
              {contact.name}
            </h2>
            {contact.phone ? (
              <>
                <p className="mt-1 text-small text-muted-foreground">{contact.phone}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {contact.whatsappUrl && (
                    <Button asChild variant="secondary">
                      <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
                        <MessageCircle />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <a href={`tel:${contact.phone}`}>
                      <Phone />
                      Call
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-small text-muted-foreground">
                {contact.name} has no phone number on file. Ask them to add one on their account page.
              </p>
            )}
          </section>
        )}
        {code && (
          <section aria-labelledby="code-heading" className="rounded-xl bg-accent p-6 text-center">
            <h2 id="code-heading" className="text-small font-normal text-accent-foreground">
              Handover code
            </h2>
            <p className="mt-1 font-display text-h1 tracking-normal" data-testid="handover-code">
              {code}
            </p>
            <CopyCodeButton code={code} />
          </section>
        )}
        <div className="flex gap-3 rounded-lg bg-muted p-4 text-small text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>Meet in a busy campus location and confirm this code before handing over the item.</p>
        </div>
        {(handover.canComplete || handover.canCancel) && <HandoverActions claimId={id} />}
        <Button asChild variant="link">
          <Link href={itemRoutes.detail(handover.item.id)}>View the post</Link>
        </Button>
      </div>
    </PageContainer>
  );
}

export default async function HandoverPage({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  return (
    <ProtectedPage user={await getShellUser()} callbackUrl={itemRoutes.handover(id)}>
      <HandoverContent id={id} />
    </ProtectedPage>
  );
}
