import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock, LockKeyhole, MapPin, Pencil, Tag, UserRound, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { friendlyDate, timeAgo } from "@/lib/format";
import { getItem, type MockViewer } from "@/lib/items/api";
import { itemRoutes } from "@/lib/items/routes";
import type { ItemDetail } from "@/lib/items/types";
import { getShellUser } from "@/lib/session";
import { ItemGallery } from "./item-gallery";
import { DeleteItemButton, ReportPostButton } from "./item-dialogs";

export async function generateMetadata({ params }: PageProps<"/items/[id]">) {
  const item = await getItem((await params).id);
  return { title: item ? `${item.title} · Campus Lost & Found` : "Item not found" };
}

/** Item details (SOF-38). */
export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  // Dev-only: ?as=owner | claimant | member to preview each action area against mock data.
  const devAs = process.env.NODE_ENV !== "production" && typeof sp.as === "string" ? sp.as : undefined;
  const item = await getItem(id, devAs === "owner" || devAs === "claimant" ? (devAs as MockViewer) : undefined);
  if (!item) notFound();

  const user = await getShellUser();
  const signedIn = Boolean(user) || devAs !== undefined;

  return (
    <PageContainer className="lg:pt-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 rounded-md text-small font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <ChevronLeft className="size-4" aria-hidden /> Back to browse
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <ItemGallery media={item.media} title={item.title} />

        <article className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ItemTypeBadge type={item.type} />
              <ItemStatusBadge status={item.status} />
            </div>
            <h1 className="text-h2 lg:text-h1">{item.title}</h1>
          </div>

          <dl className="grid gap-3 rounded-xl border bg-card p-4 text-small">
            <InfoRow icon={Tag} label="Category" value={item.category} />
            <InfoRow
              icon={MapPin}
              label={item.type === "LOST" ? "Last seen" : "Found at"}
              value={item.location}
              note={item.locationNote}
            />
            <InfoRow
              icon={CalendarDays}
              label={item.type === "LOST" ? "Date lost" : "Date found"}
              value={friendlyDate(item.date)}
            />
            <InfoRow icon={UserRound} label="Posted by" value={item.poster.displayName} />
            <InfoRow icon={Clock} label="Posted" value={timeAgo(item.postedAt)} />
          </dl>

          {item.description && (
            <section className="flex flex-col gap-1.5">
              <h2 className="font-sans text-body font-semibold">Description</h2>
              <p className="whitespace-pre-line text-muted-foreground">{item.description}</p>
            </section>
          )}

          <ActionArea item={item} signedIn={signedIn} />

          <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-small text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
            Contact details stay private. They&apos;re only shared once the poster approves a claim.
          </p>

          <ReportPostButton itemId={item.id} />
        </article>
      </div>
    </PageContainer>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <div className="grid grid-cols-[auto_7rem_1fr] items-start gap-2">
      <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium" suppressHydrationWarning>
        {value}
        {note && <span className="block font-normal text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

/** What the viewer can do, depending on who they are and the item's state. */
function ActionArea({ item, signedIn }: { item: ItemDetail; signedIn: boolean }) {
  // Owner: manage the post.
  if (item.isOwner) {
    return (
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" fullWidth>
          <Link href={itemRoutes.claims(item.id)}>
            View claims
            <Badge variant="neutral" className="bg-primary-foreground/20 text-primary-foreground">
              {item.claimCount}
            </Badge>
          </Link>
        </Button>
        {item.status === "OPEN" ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={itemRoutes.edit(item.id)}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteItemButton itemId={item.id} claimCount={item.claimCount} />
          </div>
        ) : (
          <p className="text-small text-muted-foreground">
            {item.status === "CLAIMED"
              ? "You approved a claim, so this post can't be edited. Finish the handover from the claim."
              : "This item was returned. Nice one."}
          </p>
        )}
      </div>
    );
  }

  // Already claimed by me.
  if (item.myClaim) {
    const s = item.myClaim.status;
    return (
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">Your claim</span>
          <Badge variant={s === "APPROVED" ? "success" : s === "REJECTED" ? "danger" : "warning"}>
            {s === "PENDING" ? "Pending" : s === "APPROVED" ? "Approved" : "Not approved"}
          </Badge>
        </div>
        <p className="text-small text-muted-foreground">
          {s === "PENDING" && "The poster is reviewing it. We'll let you know when they decide."}
          {s === "APPROVED" && "Approved! You can now see their contact details and arrange the handover."}
          {s === "REJECTED" && "The poster didn't approve this claim."}
        </p>
        {s === "APPROVED" ? (
          <Button asChild fullWidth>
            <Link href={itemRoutes.handover(item.myClaim.id)}>Contact & handover</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" fullWidth>
            <Link href={itemRoutes.myClaims}>Go to my claims</Link>
          </Button>
        )}
      </div>
    );
  }

  const cta = item.type === "FOUND" ? "This is mine — claim it" : "I found this";

  // Claimed / resolved: nothing to do.
  if (item.status !== "OPEN") {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" fullWidth disabled>
          {cta}
        </Button>
        <p className="text-center text-small text-muted-foreground">
          {item.status === "CLAIMED"
            ? "Someone's claim was approved and the handover is in progress."
            : "This item has already been returned."}
        </p>
      </div>
    );
  }

  const target = itemRoutes.claim(item.id);
  return (
    <div className="flex flex-col gap-2">
      <Button asChild size="lg" fullWidth>
        <Link href={signedIn ? target : `/login?callbackUrl=${encodeURIComponent(target)}`}>{cta}</Link>
      </Button>
      <p className="text-center text-small text-muted-foreground">
        {item.type === "FOUND"
          ? "You'll answer a question only the real owner would know."
          : "Tell the owner where you found it and where it is now."}
        {!signedIn && " You'll need to log in first."}
      </p>
    </div>
  );
}
