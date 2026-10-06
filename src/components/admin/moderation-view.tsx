"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileWarning, IdCard, Inbox } from "lucide-react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Verification = { id: string; submittedAt: string; documentUrl: string; user: { id: string; name: string; email: string } };
type Report = { id: string; reason: string; details?: string; createdAt: string; item: { id: string; title: string }; reporter: { name: string } };

export function ModerationView() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [acting, setActing] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

  async function refresh() {
    const [verificationResponse, reportResponse] = await Promise.all([fetch("/api/admin/verifications"), fetch("/api/admin/reports")]);
    if (verificationResponse.status === 401 || reportResponse.status === 401) { setAuthRequired(true); throw new Error("Sign in with an administrator account."); }
    if (verificationResponse.status === 403 || reportResponse.status === 403) throw new Error("Administrator access is required.");
    if (!verificationResponse.ok || !reportResponse.ok) throw new Error("Moderation queues are unavailable.");
    setVerifications((await verificationResponse.json()).verifications ?? []);
    setReports((await reportResponse.json()).reports ?? []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/admin/verifications"), fetch("/api/admin/reports")]).then(async ([verificationResponse, reportResponse]) => {
      if (verificationResponse.status === 401 || reportResponse.status === 401) { setAuthRequired(true); throw new Error("Sign in with an administrator account."); }
      if (verificationResponse.status === 403 || reportResponse.status === 403) throw new Error("Administrator access is required.");
      if (!verificationResponse.ok || !reportResponse.ok) throw new Error("Moderation queues are unavailable.");
      const [verificationData, reportData] = await Promise.all([verificationResponse.json(), reportResponse.json()]);
      if (active) { setVerifications(verificationData.verifications ?? []); setReports(reportData.reports ?? []); }
    }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function act(path: string, body: object, id: string) {
    setActing(id);
    setError(undefined);
    const response = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setActing(undefined);
    if (response.status === 401) return setAuthRequired(true);
    if (!response.ok) return setError((await response.json().catch(() => null))?.error ?? "Could not update the queue.");
    await refresh();
  }

  const dialog = <SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl="/admin" title="Sign in to open moderation" description="This queue is restricted to campus administrators." />;
  if (loading) return <><div className="h-72 animate-pulse rounded-xl bg-muted" />{dialog}</>;
  if (error && verifications.length === 0 && reports.length === 0) return <><p role="alert" className="rounded-lg bg-danger-soft p-4 text-danger-soft-foreground">{error}</p>{dialog}</>;

  return <><div className="space-y-5">{error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">{error}</p>}<Tabs defaultValue="verification"><TabsList><TabsTrigger value="verification">ID reviews <Badge>{verifications.length}</Badge></TabsTrigger><TabsTrigger value="reports">Reports <Badge>{reports.length}</Badge></TabsTrigger></TabsList><TabsContent value="verification">{verifications.length === 0 ? <Empty icon={IdCard} title="No IDs waiting" /> : <div className="grid gap-4 lg:grid-cols-2">{verifications.map((entry) => <Card key={entry.id}><CardHeader><CardTitle className="text-body">{entry.user.name}</CardTitle><p className="text-small text-muted-foreground">{entry.user.email}</p></CardHeader><CardContent><Button asChild variant="outline"><a href={entry.documentUrl} target="_blank" rel="noreferrer"><ExternalLink />Open ID image</a></Button></CardContent><CardFooter><Button variant="outline" loading={acting === entry.id} onClick={() => act(`/api/admin/verifications/${entry.id}`, { decision: "REJECT" }, entry.id)}>Reject</Button><Button loading={acting === entry.id} onClick={() => act(`/api/admin/verifications/${entry.id}`, { decision: "APPROVE" }, entry.id)}>Approve</Button></CardFooter></Card>)}</div>}</TabsContent><TabsContent value="reports">{reports.length === 0 ? <Empty icon={FileWarning} title="No reports waiting" /> : <div className="space-y-4">{reports.map((report) => <Card key={report.id}><CardHeader><CardTitle className="text-body">{report.item.title}</CardTitle><p className="text-small text-muted-foreground">Reported by {report.reporter.name}</p></CardHeader><CardContent><p className="font-medium">{report.reason}</p>{report.details && <p className="mt-2 text-small text-muted-foreground">{report.details}</p>}<Button asChild variant="link" className="mt-3"><Link href={`/items/${report.item.id}`}>View item <ExternalLink /></Link></Button></CardContent><CardFooter><Button variant="outline" loading={acting === report.id} onClick={() => act(`/api/admin/reports/${report.id}`, { decision: "DISMISS" }, report.id)}>Dismiss</Button><Button variant="danger" loading={acting === report.id} onClick={() => act(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" }, report.id)}>Remove item</Button></CardFooter></Card>)}</div>}</TabsContent></Tabs></div>{dialog}</>;
}

function Empty({ icon: Icon, title }: { icon: typeof Inbox; title: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center"><Icon className="mb-3 size-9 text-muted-foreground" aria-hidden /><h2 className="text-h3">{title}</h2><p className="mt-1 text-small text-muted-foreground">You are all caught up.</p></div>;
}
