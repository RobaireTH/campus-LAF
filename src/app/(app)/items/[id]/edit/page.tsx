import { EditItemForm } from "@/components/items/edit-item-form";
import { PageContainer } from "@/components/layout/page-container";

export default async function EditItemPage({ params }: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  return <PageContainer width="form" title="Edit item" description="Keep the details accurate while the post is open."><EditItemForm id={id} /></PageContainer>;
}
