import { AccountView } from "@/components/account/account-view";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await getShellUser();
  return (
    <ProtectedPage user={user} callbackUrl="/account">
      <PageContainer title="Account" description="Your campus identity and contact details.">
        <AccountView />
      </PageContainer>
    </ProtectedPage>
  );
}
