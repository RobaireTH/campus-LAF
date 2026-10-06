import { ModerationView } from "@/components/admin/moderation-view";
import { PageContainer } from "@/components/layout/page-container";

export default function AdminPage() {
  return <PageContainer title="Moderation" description="Review campus IDs and reported content."><ModerationView /></PageContainer>;
}
