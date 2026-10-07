import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth/callback";
import { RegisterForm } from "@/components/auth/auth-forms";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  return <AuthShell title="Join Findr" description="Create an account with your campus details." footer={<>Already have an account? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-primary hover:underline">Log in</Link></>}><RegisterForm callbackUrl={callbackUrl} /></AuthShell>;
}
