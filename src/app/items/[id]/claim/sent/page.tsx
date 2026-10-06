import Link from "next/link";
import { Check, Clock3, ContactRound, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default async function ClaimSentPage({ params }: PageProps<"/items/[id]/claim/sent">) {
  const { id } = await params;
  const steps = [
    { icon: Check, label: "Claim submitted", active: true },
    { icon: Clock3, label: "Poster reviews your details", active: true },
    { icon: ContactRound, label: "Contact details unlock if approved", active: false },
    { icon: PackageCheck, label: "Meet and complete the handover", active: false },
  ];
  return <main className="mx-auto flex min-h-screen w-full max-w-form flex-col justify-center px-gutter py-10"><div className="text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground"><Check className="size-7" aria-hidden /></span><h1 className="mt-4 text-h2">Claim sent</h1><p className="mx-auto mt-2 max-w-sm text-muted-foreground">The poster will review your ownership details. You can track the result from your dashboard.</p></div><ol className="my-8 space-y-1 rounded-xl border bg-card p-5 shadow-card">{steps.map(({ icon: Icon, label, active }, index) => <li key={label} className={`flex items-center gap-3 rounded-lg p-3 ${active ? "text-foreground" : "text-muted-foreground"}`}><span className={`flex size-8 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Icon className="size-4" aria-hidden /></span><span className="text-small font-medium">{index + 1}. {label}</span></li>)}</ol><div className="flex flex-col gap-2 sm:flex-row"><Button asChild variant="outline" fullWidth><Link href={`/items/${id}`}>Back to item</Link></Button><Button asChild fullWidth><Link href="/dashboard">Track my claims</Link></Button></div></main>;
}
