import { ModerationView } from "@/components/admin/moderation-view";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function AdminPage() {
  const user = await getShellUser();
  return (
    <ProtectedPage user={user} callbackUrl="/admin" requireAdmin>
      <PageContainer title="Moderation" description="Review campus IDs and reported content.">
        <ModerationView />
      </PageContainer>
    </ProtectedPage>
  );
}
