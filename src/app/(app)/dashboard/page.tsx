import Link from "next/link";
import { Plus } from "lucide-react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listMyClaims } from "@/lib/claims/service";
import { itemRoutes } from "@/lib/items/routes";
import { listMyItems } from "@/lib/items/service";
import { getShellUser } from "@/lib/session";

export const metadata = { title: "Dashboard · Campus Lost & Found" };

async function DashboardContent({ tab }: { tab: string | string[] | undefined }) {
  const user = await requireUser();
  const [posts, claims] = await Promise.all([listMyItems(user), listMyClaims(user)]);
  return <DashboardView posts={posts} claims={claims} tab={tab === "claims" ? "claims" : "posts"} />;
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const [user, { tab }] = await Promise.all([getShellUser(), searchParams]);
  return (
    <ProtectedPage user={user} callbackUrl={tab === "claims" ? itemRoutes.myClaims : "/dashboard"}>
      <PageContainer
        title="Dashboard"
        description="Track your posts, claims, and successful returns."
        actions={
          <Button asChild>
            <Link href="/report">
              <Plus />
              Report an item
            </Link>
          </Button>
        }
      >
        <DashboardContent tab={tab} />
      </PageContainer>
    </ProtectedPage>
  );
}
