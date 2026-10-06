import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const requested = (await searchParams).callbackUrl;
  const callbackUrl = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return <AuthShell title="Welcome back" description="Log in to report, claim, and return campus items." footer={<>New here? <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-primary hover:underline">Create an account</Link></>}><LoginForm callbackUrl={callbackUrl} /></AuthShell>;
}
