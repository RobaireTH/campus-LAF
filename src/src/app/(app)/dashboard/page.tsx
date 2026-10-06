import { getDashboard } from "@/lib/mock/dashboard";
import { ItemCard } from "@/components/items/ItemCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Dashboard · Findr" };

export default async function DashboardPage() {
  const { user, stats, needsAction, matches, recent } = await getDashboard();
  const first = needsAction[0];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-ink">Hi, {user.name}</h1>

      {user.verified && (
        <div className="flex gap-2 rounded-xl bg-banner-bg px-4 py-3 text-banner-fg">
          <span aria-hidden>✓</span>
          <p>Your student ID is verified — you can post and claim items.</p>
        </div>
      )}

      <section aria-label="Summary" className="grid grid-cols-3 gap-3">
        <StatTile value={stats.posts} label="My posts" />
        <StatTile value={stats.claimsToReview} label="Claims to review" />
        <StatTile value={stats.claims} label="My claims" />
      </section>

      {needsAction.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Needs your action</h2>
            <Badge tone="amber">{needsAction.length} new</Badge>
          </div>
          <div className="space-y-3">
            {needsAction.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                colorIndex={i}
                trailing={<ButtonLink href={`/items/${item.id}/claims`}>Review</ButtonLink>}
              />
            ))}
          </div>
          <p className="mt-4 text-muted">
            {first.claimCount} people claimed your {first.title}. Compare their answers and
            approve the real owner.
          </p>
        </section>
      )}

      {matches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">Possible matches for your lost item</h2>
          {matches.map((item, i) => (
            <ItemCard key={item.id} item={item} colorIndex={i + 1} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink">Your recent posts</h2>
        {/* TODO (SOF-32): show the "Report your first item" empty state when recent is empty */}
        {recent.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            colorIndex={i === 0 ? 0 : 1}
            trailing={
              item.claimCount ? (
                <Badge>{item.claimCount} claims</Badge>
              ) : (
                <Badge>Open</Badge>
              )
            }
          />
        ))}
        <ButtonLink href="/my-posts" variant="outline">
          See all my posts
        </ButtonLink>
      </section>
    </div>
  );
}
