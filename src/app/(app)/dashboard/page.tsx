import Link from "next/link";
import { Plus } from "lucide-react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getShellUser();
  return (
    <ProtectedPage user={user} callbackUrl="/dashboard">
      <PageContainer title="Dashboard" description="Track your posts, claims, and successful returns." actions={<Button asChild><Link href="/report"><Plus />Report an item</Link></Button>}>
        <DashboardView />
      </PageContainer>
    </ProtectedPage>
  );
}
