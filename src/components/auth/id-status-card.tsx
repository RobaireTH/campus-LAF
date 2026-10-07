import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const CONTENT = {
  PENDING: {
    icon: Clock3,
    title: "Your ID is under review",
    text: "An admin usually reviews it within a school day. You can keep browsing while you wait, and claiming unlocks as soon as it is approved.",
  },
  VERIFIED: {
    icon: ShieldCheck,
    title: "Your ID is verified",
    text: "You can claim items and approve claims on your posts.",
  },
} as const;

export function IdStatusCard({ status, callbackUrl }: { status: keyof typeof CONTENT; callbackUrl: string }) {
  const { icon: Icon, title, text } = CONTENT[status];
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent">
        <Icon className="size-7 text-accent-foreground" aria-hidden />
      </span>
      <h2 className="text-h3">{title}</h2>
      <p className="text-muted-foreground">{text}</p>
      <Button asChild size="lg" fullWidth>
        <Link href={callbackUrl}>Continue</Link>
      </Button>
    </div>
  );
}
