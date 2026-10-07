import { MODERATION_TABS, ModerationView } from "@/components/admin/moderation-view";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { requireAdmin } from "@/lib/auth";
import { listAdminItems, listReports, listVerifications } from "@/lib/moderation/service";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Moderation · Campus Lost & Found" };

async function ModerationContent({ tab }: { tab: string | string[] | undefined }) {
  await requireAdmin();
  const [verifications, reports, posts] = await Promise.all([listVerifications(), listReports(), listAdminItems({})]);

  return (
    <ModerationView
      verifications={verifications.map((entry) => ({ ...entry, submittedAt: entry.submittedAt?.toISOString() ?? null }))}
      reports={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))}
      posts={{ ...posts, items: posts.items.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() })) }}
      tab={MODERATION_TABS.find((known) => known === tab)}
    />
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const [user, { tab }] = await Promise.all([getShellUser(), searchParams]);
  return (
    <ProtectedPage user={user} callbackUrl="/admin" requireAdmin>
      <PageContainer title="Moderation" description="Review campus IDs, reported posts, and everything on the board.">
        <ModerationContent tab={tab} />
      </PageContainer>
    </ProtectedPage>
  );
}
