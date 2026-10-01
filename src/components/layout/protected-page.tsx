import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { routes, type ShellUser } from "@/components/layout/nav-config";

export interface ProtectedPageProps {
  /** Current user from the session (SOF-40). `null` = signed out → sent to login. */
  user: ShellUser | null;
  /** Path to come back to after login, e.g. "/report". */
  callbackUrl: string;
  /** Block the page until the student ID is approved (claiming, posting found items…). */
  requireVerified?: boolean;
  /** Admin-only pages (KYC queue, moderation). Non-admins get a 404. */
  requireAdmin?: boolean;
  /** Explain what verification unlocks on this page. */
  verifyReason?: string;
  children: React.ReactNode;
}

/**
 * Server-side guard for pages that need a signed-in (and maybe verified / admin) user.
 * The API routes still enforce this themselves (SOF-46) — this is for the UI.
 *
 * export default async function ReportPage() {
 *   const user = await getShellUser();
 *   return (
 *     <ProtectedPage user={user} callbackUrl="/report">
 *       <PageContainer width="form" title="Report an item">…</PageContainer>
 *     </ProtectedPage>
 *   );
 * }
 */
export function ProtectedPage({
  user,
  callbackUrl,
  requireVerified,
  requireAdmin,
  verifyReason = "You need a verified student ID before you can do this.",
  children,
}: ProtectedPageProps) {
  if (!user) redirect(`${routes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (requireAdmin && user.role !== "ADMIN") notFound();

  if (requireVerified && !user.verified) {
    return (
      <PageContainer width="form" className="flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-card">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent">
            <ShieldCheck className="size-7 text-accent-foreground" aria-hidden />
          </span>
          <h1 className="text-h2">Verify your student ID</h1>
          <p className="text-muted-foreground">{verifyReason} It takes about a minute and an admin reviews it within a day.</p>
          <Button asChild size="lg">
            <Link href={`${routes.verify}?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Verify my ID</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return <>{children}</>;
}
