"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleUserRound, LogOut, Mail, Phone, ShieldAlert } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendJson } from "@/lib/api-client";

type Account = { name: string; email: string; phone?: string | null; role: string; kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" };

export function AccountView() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [account, setAccount] = useState<Account>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me").then(async (response) => ({ response, result: await response.json().catch(() => null) })).then(({ response, result }) => {
      if (!active) return;
      if (response.status === 401) { setAuthRequired(true); setError("Sign in to view your account."); }
      else if (!response.ok) setError(result?.error ?? "Account details are unavailable.");
      else setAccount(result.user ?? result);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    setLoggingOut(true);
    await sendJson("/api/auth/logout", "POST").catch(() => undefined);
    router.push("/");
    router.refresh();
  }

  const dialog = <SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl="/account" title="Sign in to view your account" description="Your contact details and campus verification are private." />;
  if (loading) return <><div className="h-72 animate-pulse rounded-xl bg-muted" />{dialog}</>;
  if (error || !account) return <><div className="rounded-xl border bg-card p-8 text-center"><ShieldAlert className="mx-auto size-9 text-muted-foreground" aria-hidden /><h2 className="mt-3 text-h3">{error ?? "Account unavailable"}</h2><Button asChild className="mt-5"><Link href="/login?callbackUrl=%2Faccount">Log in</Link></Button></div>{dialog}</>;

  const verification = {
    NOT_SUBMITTED: { label: "Not verified", variant: "neutral" as const, copy: "Verify your school ID to strengthen claims and protected actions." },
    PENDING: { label: "Under review", variant: "warning" as const, copy: "Your school ID is being reviewed." },
    VERIFIED: { label: "Verified", variant: "success" as const, copy: "Your campus membership is verified." },
    REJECTED: { label: "Needs attention", variant: "danger" as const, copy: "Submit a clearer school ID image for another review." },
  }[account.kycStatus];

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><Card><CardHeader><div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><CircleUserRound className="size-7" aria-hidden /></div><div><CardTitle>{account.name}</CardTitle><Badge variant="outline">{account.role.toLowerCase()}</Badge></div></CardHeader><CardContent className="space-y-4"><p className="flex items-center gap-3 text-small"><Mail className="size-4 text-muted-foreground" aria-hidden />{account.email}</p>{account.phone && <p className="flex items-center gap-3 text-small"><Phone className="size-4 text-muted-foreground" aria-hidden />{account.phone}</p>}<Button variant="outline" loading={loggingOut} onClick={logout}><LogOut />Log out</Button></CardContent></Card><Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-body">Campus verification</CardTitle><Badge variant={verification.variant}>{verification.label}</Badge></div></CardHeader><CardContent><BadgeCheck className="mb-3 size-8 text-primary" aria-hidden /><p className="text-small text-muted-foreground">{verification.copy}</p>{account.kycStatus !== "VERIFIED" && account.kycStatus !== "PENDING" && <Button asChild fullWidth className="mt-5"><Link href="/verify-id">Verify ID</Link></Button>}</CardContent></Card></div>;
}
