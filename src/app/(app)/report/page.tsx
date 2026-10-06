import { PageContainer } from "@/components/layout/page-container";
import { ReportItemForm } from "@/components/items/report-item-form";

export default function ReportPage() {
  return <PageContainer width="form" title="Report an item" description="Share enough detail for the right person to recognize it."><ReportItemForm /></PageContainer>;
}
