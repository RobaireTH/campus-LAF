import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return <main className="flex min-h-[70vh] items-center justify-center px-gutter py-12"><div className="max-w-md text-center"><SearchX className="mx-auto size-12 text-muted-foreground" aria-hidden /><p className="font-display text-display text-primary">404</p><h1 className="mt-2 text-h2">Nothing here</h1><p className="mt-2 text-muted-foreground">This page may have moved or the item is no longer available.</p><Button asChild className="mt-6"><Link href="/">Browse items</Link></Button></div></main>;
}
