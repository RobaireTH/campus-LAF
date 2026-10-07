import Link from "next/link";
import { ArrowRight, ClipboardList, Inbox, PackageCheck, Plus, Search } from "lucide-react";

import { Badge, ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { claimProgress } from "@/lib/claims/labels";
import type { listMyClaims } from "@/lib/claims/service";
import { friendlyDate } from "@/lib/format";
import { itemRoutes } from "@/lib/items/routes";
import type { listMyItems } from "@/lib/items/service";

type MyPost = Awaited<ReturnType<typeof listMyItems>>[number];
type MyClaim = Awaited<ReturnType<typeof listMyClaims>>[number];

export type DashboardTab = "posts" | "claims";

interface DashboardViewProps {
  posts: MyPost[];
  claims: MyClaim[];
  tab: DashboardTab;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

const ROW_LINK =
  "flex min-w-0 flex-1 basis-56 items-center gap-4 rounded-md outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/40";

export function DashboardView({ posts, claims, tab }: DashboardViewProps) {
  const toReview = posts.reduce((sum, post) => sum + post.pendingClaimCount, 0);
  const active = posts.filter((post) => post.status === "OPEN" || post.status === "CLAIMED").length;
  const returned = posts.filter((post) => post.status === "RESOLVED").length;

  return (
    <div className="space-y-7">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={ClipboardList} label="Active posts" value={active} />
        <Metric icon={Inbox} label="Claims to review" value={toReview} />
        <Metric icon={PackageCheck} label="Items returned" value={returned} />
      </div>
      <Tabs defaultValue={tab}>
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="posts">
            My posts
            {toReview > 0 && <Badge variant="warning">{toReview}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="claims">My claims</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          {posts.length === 0 ? (
            <Empty
              icon={Plus}
              title="No posts yet"
              copy="Report a lost or found item to see it here."
              href="/report"
              label="Report an item"
            />
          ) : (
            <List>
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </List>
          )}
        </TabsContent>
        <TabsContent value="claims">
          {claims.length === 0 ? (
            <Empty
              icon={Search}
              title="No claims yet"
              copy="When you claim an item, its progress appears here."
              href="/"
              label="Browse items"
            />
          ) : (
            <List>
              {claims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} />
              ))}
            </List>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostRow({ post }: { post: MyPost }) {
  const reviewing = post.status === "OPEN" && post.pendingClaimCount > 0;
  const detail = [friendlyDate(post.eventDate.toISOString()), plural(post.claimCount, "claim")].join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-3 border-b px-4 py-4 last:border-0">
      <Link href={itemRoutes.detail(post.id)} className={ROW_LINK}>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <ItemTypeBadge type={post.type} />
            <ItemStatusBadge status={post.status} />
          </div>
          <p className="truncate font-semibold">{post.title}</p>
          <p className="text-small text-muted-foreground">{detail}</p>
        </div>
        {!reviewing && !post.handoverClaimId && <ArrowRight className="size-5 text-muted-foreground" aria-hidden />}
      </Link>
      {reviewing && (
        <Button asChild size="sm">
          <Link href={itemRoutes.claims(post.id)}>{`Review ${plural(post.pendingClaimCount, "claim")}`}</Link>
        </Button>
      )}
      {post.handoverClaimId && (
        <Button asChild size="sm" variant="secondary">
          <Link href={itemRoutes.handover(post.handoverClaimId)}>Open handover</Link>
        </Button>
      )}
    </li>
  );
}

function ClaimRow({ claim }: { claim: MyClaim }) {
  const progress = claimProgress({ status: claim.status, itemStatus: claim.item.status });
  const toHandover = claim.status === "APPROVED" && claim.item.status === "CLAIMED";
  const href = toHandover ? itemRoutes.handover(claim.id) : itemRoutes.detail(claim.item.id);

  return (
    <li className="border-b px-4 py-4 last:border-0">
      <Link href={href} className={ROW_LINK}>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <ItemTypeBadge type={claim.item.type} />
            <Badge variant={progress.tone}>{progress.label}</Badge>
          </div>
          <p className="truncate font-semibold">{claim.item.title}</p>
          <p className="text-small text-muted-foreground">
            {progress.description} Submitted {friendlyDate(claim.createdAt)}.
          </p>
        </div>
        <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="overflow-hidden rounded-xl border bg-card shadow-card">{children}</ul>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-h3">{value}</p>
          <p className="text-small text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyProps {
  icon: typeof Inbox;
  title: string;
  copy: string;
  href: string;
  label: string;
}

function Empty({ icon: Icon, title, copy, href, label }: EmptyProps) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-7 text-center">
      <Icon className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-h3">{title}</h2>
      <p className="mt-1 max-w-sm text-small text-muted-foreground">{copy}</p>
      <Button asChild className="mt-5">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
