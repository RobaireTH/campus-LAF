import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const requested = (await searchParams).callbackUrl;
  const callbackUrl = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return <AuthShell title="Join Findr" description="Create an account with your campus details." footer={<>Already have an account? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-primary hover:underline">Log in</Link></>}><RegisterForm callbackUrl={callbackUrl} /></AuthShell>;
}
