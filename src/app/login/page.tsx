import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return <AuthShell title="Welcome back" description="Log in to report, claim, and return campus items." footer={<>New here? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link></>}><LoginForm /></AuthShell>;
}
