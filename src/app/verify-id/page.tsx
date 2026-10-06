import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyIdForm } from "@/components/auth/auth-forms";

export default function VerifyIdPage() {
  return <AuthShell title="Verify your campus ID" description="Verification keeps claims trustworthy and contact details private." footer="Reviews usually take less than one school day."><VerifyIdForm /></AuthShell>;
}
