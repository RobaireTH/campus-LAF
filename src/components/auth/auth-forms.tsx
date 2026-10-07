"use client";

import { ComponentProps, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { ApiRequestError, sendJson } from "@/lib/api-client";
import { AuthRequiredError, uploadFile } from "@/lib/uploads/client";

type PasswordInputProps = { id: string; name: string; autoComplete: string } & Pick<
  ComponentProps<"input">,
  "aria-invalid" | "aria-describedby" | "aria-required"
>;

function PasswordInput({ id, name, autoComplete, ...aria }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required className="pr-12" {...aria} />
      <button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </button>
    </div>
  );
}

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    try {
      await sendJson("/api/auth/login", "POST", { email: data.get("email"), password: data.get("password") });
      router.push(callbackUrl);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Could not log you in. Try again.");
    } finally {
      setLoading(false);
    }
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

export function RegisterForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    try {
      await sendJson("/api/auth/register", "POST", Object.fromEntries(data));
      router.push(`/verify-id?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      router.refresh();
    } catch (cause) {
      if (!(cause instanceof ApiRequestError)) return setError("Could not create your account. Try again.");
      setFieldErrors(cause.fields);
      setError(Object.keys(cause.fields).length ? undefined : cause.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={fieldErrors.name?.[0]} required><Input id="name" name="name" autoComplete="name" placeholder="Ada Okafor" required /></Field>
        <Field id="phone" label="Phone number" error={fieldErrors.phone?.[0]} required><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0801 234 5678" required /></Field>
      </div>
      <Field id="email" label="School email" hint="Use the email issued by your school." error={fieldErrors.email?.[0]} required><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@school.edu" required /></Field>
      <Field id="password" label="Password" hint="At least 8 characters." error={fieldErrors.password?.[0]} required><PasswordInput id="password" name="password" autoComplete="new-password" /></Field>
      {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-small text-danger-soft-foreground">{error}</p>}
      <Button type="submit" size="lg" fullWidth loading={loading}>Create account</Button>
    </form>
  );
}

export function VerifyIdForm({ callbackUrl = "/", rejectionReason }: { callbackUrl?: string; rejectionReason?: string | null }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [authRequired, setAuthRequired] = useState(false);

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
      if (cause instanceof AuthRequiredError) return setAuthRequired(true);
      return setError(cause instanceof Error ? cause.message : "Could not upload your ID.");
    }
    const response = await fetch("/api/me/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    setLoading(false);
    if (response.status === 401) return setAuthRequired(true);
    if (!response.ok) return setError((await response.json().catch(() => null))?.error ?? "Could not submit your ID.");
    router.refresh();
  }

  return (
    <><form onSubmit={submit} className="space-y-5">
      {rejectionReason && <p role="alert" className="rounded-md bg-danger-soft p-4 text-small text-danger-soft-foreground"><span className="font-semibold">Your last photo was not accepted.</span> {rejectionReason}</p>}
      <div className="flex gap-3 rounded-md bg-success-soft p-4 text-small text-success-soft-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden /><p>Your ID is used only to verify campus membership and is never shown publicly.</p></div>
      <Field id="school-id" label="School ID" hint="Make sure your name, photo, and school are readable." required><PhotoPicker id="school-id" value={files} onChange={setFiles} maxFiles={1} maxSizeMB={5} capture="environment" /></Field>
      {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-small text-danger-soft-foreground">{error}</p>}
      <Button type="submit" size="lg" fullWidth loading={loading}>Submit for verification</Button>
      <Button type="button" variant="ghost" fullWidth onClick={() => router.push(callbackUrl)}>Do this later</Button>
    </form><SignInDialog open={authRequired} onOpenChange={setAuthRequired} callbackUrl={`/verify-id?callbackUrl=${encodeURIComponent(callbackUrl)}`} title="Sign in before verification" description="Your ID submission must be attached to your campus account." /></>
  );
}
