import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageContainer } from "@/components/layout/page-container";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return <PageContainer title="Dashboard" description="Track your posts, claims, and successful returns." actions={<Button asChild><Link href="/report"><Plus />Report an item</Link></Button>}><DashboardView /></PageContainer>;
}
