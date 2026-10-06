import { AccountView } from "@/components/account/account-view";
import { PageContainer } from "@/components/layout/page-container";

export default function AccountPage() {
  return <PageContainer title="Account" description="Your campus identity and contact details."><AccountView /></PageContainer>;
}
