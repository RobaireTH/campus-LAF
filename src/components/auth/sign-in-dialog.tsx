import Link from "next/link";
import { LogIn, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SignInDialog({ open, onOpenChange, callbackUrl, title = "Sign in to continue", description = "Your account keeps campus activity secure and lets you return to this step." }: { open: boolean; onOpenChange: (open: boolean) => void; callbackUrl: string; title?: string; description?: string }) {
  const destination = encodeURIComponent(callbackUrl);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><span className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-6" aria-hidden /></span><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter className="sm:flex-col"><Button asChild fullWidth><Link href={`/login?callbackUrl=${destination}`}><LogIn />Log in</Link></Button><Button asChild variant="outline" fullWidth><Link href={`/register?callbackUrl=${destination}`}>Create account</Link></Button></DialogFooter></DialogContent></Dialog>;
}
