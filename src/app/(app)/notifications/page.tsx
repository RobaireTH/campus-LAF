import { PageContainer } from "@/components/layout/page-container";
import { NotificationList } from "@/components/notifications/notification-list";

export default function NotificationsPage() {
  return <PageContainer title="Notifications" description="Updates about your posts, claims, and handovers."><NotificationList /></PageContainer>;
}
