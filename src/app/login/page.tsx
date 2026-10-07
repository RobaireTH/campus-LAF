import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth/callback";
import { LoginForm } from "@/components/auth/auth-forms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  return <AuthShell title="Welcome back" description="Log in to report, claim, and return campus items." footer={<>New here? <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-primary hover:underline">Create an account</Link></>}><LoginForm callbackUrl={callbackUrl} /></AuthShell>;
}
