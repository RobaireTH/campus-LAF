import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyIdForm } from "@/components/auth/auth-forms";

export default async function VerifyIdPage({ searchParams }: PageProps<"/verify-id">) {
  const requested = (await searchParams).callbackUrl;
  const callbackUrl = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return <AuthShell title="Verify your campus ID" description="Verification keeps claims trustworthy and contact details private." footer="Reviews usually take less than one school day."><VerifyIdForm callbackUrl={callbackUrl} /></AuthShell>;
}
