"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, ShieldCheck, UserRound } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Claim = { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; description: string; createdAt: string; claimant: { name: string; verified: boolean }; media: { id: string; url: string; type: "IMAGE" | "VIDEO" }[] };

export default function ReviewClaimsPage({ params }: PageProps<"/items/[id]/claims">) {
  const { id } = use(params);
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [acting, setActing] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  async function load() {
    const response = await fetch(`/api/items/${id}/claims`);
    const result = await response.json().catch(() => null);
    if (response.status === 401) { setAuthRequired(true); setError("Sign in to review claims."); }
    else if (!response.ok) setError(result?.error ?? "Could not load claims.");
    else setClaims(result.claims ?? result ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/items/${id}/claims`).then(async (response) => ({ response, result: await response.json().catch(() => null) })).then(({ response, result }) => {
      if (!active) return;
      if (response.status === 401) { setAuthRequired(true); setError("Sign in to review claims."); }
      else if (!response.ok) setError(result?.error ?? "Could not load claims.");
      else setClaims(result.claims ?? result ?? []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function decide(claimId: string, decision: "APPROVE" | "REJECT") {
    setActing(claimId);
    setError(undefined);
    const response = await fetch(`/api/claims/${claimId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const result = await response.json().catch(() => null);
    setActing(undefined);
    if (response.status === 401) return setAuthRequired(true);
    if (!response.ok) return setError(result?.error ?? "Could not update this claim.");
    if (decision === "APPROVE") return router.push(`/claims/${claimId}`);
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8 lg:py-12">
      <Link href={`/items/${id}`} className="mb-6 inline-flex items-center gap-1 text-small font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden />Back to item</Link>
      <div className="mb-7"><h1 className="text-h2">Review claims</h1><p className="mt-1 text-muted-foreground">Compare private ownership details before choosing a claimant.</p></div>
      {error && <p role="alert" className="mb-5 rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">{error}</p>}
      {loading ? <div className="h-52 animate-pulse rounded-xl bg-muted" /> : claims.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center"><Inbox className="mb-3 size-9 text-muted-foreground" aria-hidden /><h2 className="text-h3">No claims yet</h2><p className="mt-1 text-small text-muted-foreground">New claims will appear here for review.</p></div> : <div className="space-y-4">{claims.map((claim) => <Card key={claim.id}><CardHeader><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-muted"><UserRound className="size-5" aria-hidden /></span><div><CardTitle className="text-body">{claim.claimant.name}</CardTitle><p className="flex items-center gap-1 text-caption text-muted-foreground">{claim.claimant.verified && <ShieldCheck className="size-3.5 text-success" aria-hidden />}Submitted {new Date(claim.createdAt).toLocaleDateString()}</p></div></div><Badge variant={claim.status === "APPROVED" ? "success" : claim.status === "REJECTED" ? "danger" : "warning"}>{claim.status.toLowerCase()}</Badge></CardHeader><CardContent><p className="whitespace-pre-line rounded-lg bg-muted p-4 text-small">{claim.description}</p>{claim.media.length > 0 && <p className="mt-3 text-caption text-muted-foreground">{claim.media.length} proof {claim.media.length === 1 ? "file" : "files"} attached</p>}</CardContent>{claim.status === "PENDING" && <CardFooter className="justify-end"><Button variant="outline" loading={acting === claim.id} onClick={() => decide(claim.id, "REJECT")}>Reject</Button><Button loading={acting === claim.id} onClick={() => decide(claim.id, "APPROVE")}>Approve claim</Button></CardFooter>}</Card>)}</div>}
      <SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl={`/items/${id}/claims`} title="Sign in to review claims" description="Ownership evidence is private and only visible to the person who posted the item." />
    </main>
  );
}
