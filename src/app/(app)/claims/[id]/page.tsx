"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

type Handover = { claimId: string; status: "APPROVED" | "RESOLVED" | "CANCELLED"; item: { id: string; title: string }; contact: { name: string; phone?: string; email?: string; whatsappUrl?: string }; code: string; canComplete: boolean; canCancel: boolean };

export default function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Handover>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/claims/${id}/handover`).then(async (response) => ({ response, result: await response.json().catch(() => null) })).then(({ response, result }) => {
      if (!active) return;
      if (!response.ok) setError(result?.error ?? "Could not load handover details.");
      else setData(result.handover ?? result);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function update(action: "COMPLETE" | "CANCEL") {
    setActing(true);
    const response = await fetch(`/api/claims/${id}/handover`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json().catch(() => null);
    setActing(false);
    if (!response.ok) return setError(result?.error ?? "Could not update the handover.");
    setData(result.handover ?? result);
  }

  if (loading) return <PageContainer width="form"><div className="h-96 animate-pulse rounded-xl bg-muted" /></PageContainer>;
  if (error || !data) return <PageContainer width="form" title="Handover unavailable"><p className="rounded-lg bg-danger-soft p-4 text-danger-soft-foreground">{error ?? "These details are unavailable."}</p></PageContainer>;
  if (data.status === "RESOLVED") return <PageContainer width="form"><div className="py-16 text-center"><CheckCircle2 className="mx-auto size-14 text-success" aria-hidden /><h1 className="mt-4 text-h2">Item returned</h1><p className="mt-2 text-muted-foreground">This handover is complete.</p><Button asChild className="mt-6"><Link href="/dashboard">Return to dashboard</Link></Button></div></PageContainer>;

  return <PageContainer width="form" title="Contact and handover" description={data.item.title}><div className="space-y-5"><div className="rounded-xl border bg-card p-5 shadow-card"><h2 className="text-h3">{data.contact.name}</h2><div className="mt-4 grid grid-cols-3 gap-2">{data.contact.whatsappUrl && <Button asChild variant="secondary"><a href={data.contact.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>}{data.contact.phone && <Button asChild variant="outline"><a href={`tel:${data.contact.phone}`}><Phone />Call</a></Button>}{data.contact.email && <Button asChild variant="outline"><a href={`mailto:${data.contact.email}`}><Mail />Email</a></Button>}</div></div><div className="rounded-xl bg-accent p-6 text-center"><p className="text-small text-accent-foreground">Handover code</p><p className="mt-1 font-display text-h1 tracking-normal">{data.code}</p><Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(data.code)}><Copy />Copy code</Button></div><div className="flex gap-3 rounded-lg bg-muted p-4 text-small text-muted-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden /><p>Meet in a busy campus location and confirm this code before handing over the item.</p></div>{error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-small text-danger-soft-foreground">{error}</p>}<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{data.canCancel && <Button variant="outline" loading={acting} onClick={() => update("CANCEL")}>Cancel handover</Button>}{data.canComplete && <Button loading={acting} onClick={() => update("COMPLETE")}>Mark as returned</Button>}</div></div></PageContainer>;
}
