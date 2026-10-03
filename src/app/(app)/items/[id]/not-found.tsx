import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default function ItemNotFound() {
  return (
    <PageContainer width="form" className="flex flex-col items-center justify-center text-center">
      <div className="flex flex-col items-center gap-3">
        <SearchX className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-h2">This item isn&apos;t here</h1>
        <p className="text-muted-foreground">It may have been removed, returned, or the link is wrong.</p>
        <Button asChild>
          <Link href="/">Browse all items</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
