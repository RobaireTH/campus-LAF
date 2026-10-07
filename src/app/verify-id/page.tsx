import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { IdStatusCard } from "@/components/auth/id-status-card";
import { VerifyIdForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth/callback";

export default async function VerifyIdPage({ searchParams }: PageProps<"/verify-id">) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  const user = await getCurrentUser();
  if (!user) {
    const here = `/verify-id?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(here)}`);
  }

  const reviewed = user.kycStatus === "PENDING" || user.kycStatus === "VERIFIED";
  return (
    <AuthShell title="Verify your campus ID" description="Verification keeps claims trustworthy and contact details private." footer="Reviews usually take less than one school day.">
      {reviewed ? (
        <IdStatusCard status={user.kycStatus as "PENDING" | "VERIFIED"} callbackUrl={callbackUrl} />
      ) : (
        <VerifyIdForm callbackUrl={callbackUrl} rejectionReason={user.kycStatus === "REJECTED" ? user.kycRejectionReason : null} />
      )}
    </AuthShell>
  );
}
