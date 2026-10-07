import Link from "next/link";
import { notFound } from "next/navigation";

import { EditItemForm } from "@/components/items/edit-item-form";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getItem } from "@/lib/items/queries";
import { listTaxonomy } from "@/lib/items/taxonomy";
import { getShellUser } from "@/lib/session";

const NOT_EDITABLE: Record<string, string> = {
  CLAIMED: "A claim was approved, so this post can't be edited. Finish the handover from the claim.",
  RESOLVED: "This item was already returned, so the post can't be edited.",
  REMOVED: "This post was removed.",
};

async function EditItemContent({ id }: { id: string }) {
  const [item, { categories, locations }] = await Promise.all([getItem(id), listTaxonomy()]);
  if (!item?.isOwner) notFound();

  if (item.status !== "OPEN") {
    return (
      <PageContainer width="form" title="Edit item">
        <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6">
          <p className="text-muted-foreground">{NOT_EDITABLE[item.status]}</p>
          <Button asChild variant="outline"><Link href={`/items/${id}`}>Back to the post</Link></Button>
        </div>
      </PageContainer>
    );
  }

  const editable = {
    id: item.id,
    title: item.title,
    description: item.description,
    locationNote: item.locationNote,
    date: item.date,
    categoryId: categories.find((option) => option.label === item.category)?.value ?? "",
    locationId: locations.find((option) => option.label === item.location)?.value ?? "",
  };
  return (
    <PageContainer width="form" title="Edit item" description="Keep the details accurate while the post is open.">
      <EditItemForm item={editable} categories={categories} locations={locations} />
    </PageContainer>
  );
}

export default async function EditItemPage({ params }: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  const user = await getShellUser();
  return (
    <ProtectedPage user={user} callbackUrl={`/items/${id}/edit`}>
      <EditItemContent id={id} />
    </ProtectedPage>
  );
}
