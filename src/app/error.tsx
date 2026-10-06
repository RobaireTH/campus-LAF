"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-[70vh] items-center justify-center px-gutter py-12"><div className="max-w-md text-center"><CircleAlert className="mx-auto size-12 text-danger" aria-hidden /><h1 className="mt-4 text-h2">Something went wrong</h1><p className="mt-2 text-muted-foreground">The page could not be loaded. Try again or return to browse.</p><div className="mt-6 flex justify-center gap-2"><Button variant="outline" onClick={reset}>Try again</Button><Button asChild><Link href="/">Browse items</Link></Button></div></div></main>;
}
