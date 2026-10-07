import { ReportItemForm } from "@/components/items/report-item-form";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { listTaxonomy } from "@/lib/items/taxonomy";
import { getShellUser } from "@/lib/session";

async function ReportContent() {
  const { categories, locations } = await listTaxonomy();
  return (
    <PageContainer width="form" title="Report an item" description="Share enough detail for the right person to recognize it.">
      <ReportItemForm categories={categories} locations={locations} />
    </PageContainer>
  );
}

export default async function ReportPage() {
  const user = await getShellUser();
  return (
    <ProtectedPage user={user} callbackUrl="/report">
      <ReportContent />
    </ProtectedPage>
  );
}
