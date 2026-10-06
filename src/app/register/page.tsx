import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return <AuthShell title="Join Findr" description="Create an account with your campus details." footer={<>Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link></>}><RegisterForm /></AuthShell>;
}
