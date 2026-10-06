"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { uploadFile } from "@/lib/uploads/client";

function PasswordInput({ id, name, autoComplete }: { id: string; name: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required className="pr-12" />
      <button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false });
    setLoading(false);
    if (result?.error) return setError("Email or password is incorrect.");
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field id="email" label="School email" required><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@school.edu" required /></Field>
      <Field id="password" label="Password" required><PasswordInput id="password" name="password" autoComplete="current-password" /></Field>
      {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-small text-danger-soft-foreground">{error}</p>}
      <Button type="submit" size="lg" fullWidth loading={loading}>Log in</Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    setLoading(false);
    if (!response.ok) return setError((await response.json().catch(() => null))?.error ?? "Could not create your account.");
    router.push("/verify-id");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" required><Input id="name" name="name" autoComplete="name" placeholder="Ada Okafor" required /></Field>
        <Field id="phone" label="Phone number" required><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0801 234 5678" required /></Field>
      </div>
      <Field id="email" label="School email" hint="Use the email issued by your school." required><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@school.edu" required /></Field>
      <Field id="password" label="Password" hint="At least 8 characters." required><PasswordInput id="password" name="password" autoComplete="new-password" /></Field>
      {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-small text-danger-soft-foreground">{error}</p>}
      <Button type="submit" size="lg" fullWidth loading={loading}>Create account</Button>
    </form>
  );
}

export function VerifyIdForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files[0]) return setError("Add a clear photo of your school ID.");
    setLoading(true);
    setError(undefined);
    let key: string;
    try {
      key = await uploadFile(files[0], "kyc");
    } catch (cause) {
      setLoading(false);
      return setError(cause instanceof Error ? cause.message : "Could not upload your ID.");
    }
    const response = await fetch("/api/me/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    setLoading(false);
    if (!response.ok) return setError((await response.json().catch(() => null))?.error ?? "Could not submit your ID.");
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-3 rounded-md bg-success-soft p-4 text-small text-success-soft-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden /><p>Your ID is used only to verify campus membership and is never shown publicly.</p></div>
      <Field id="school-id" label="School ID" hint="Make sure your name, photo, and school are readable." required><PhotoPicker id="school-id" value={files} onChange={setFiles} maxFiles={1} maxSizeMB={5} capture="environment" /></Field>
      {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-small text-danger-soft-foreground">{error}</p>}
      <Button type="submit" size="lg" fullWidth loading={loading}>Submit for verification</Button>
      <Button type="button" variant="ghost" fullWidth onClick={() => router.push("/")}>Do this later</Button>
    </form>
  );
}
