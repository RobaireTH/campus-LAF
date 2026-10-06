import Link from "next/link";
import type { ReactNode } from "react";

const base =
  "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const variants = {
  primary: "bg-brand px-5 py-3 text-white hover:bg-brand-dark",
  outline: "w-full border border-ink bg-white px-5 py-3 text-ink hover:bg-cream",
};

type Props = { href: string; variant?: keyof typeof variants; children: ReactNode };

// Link-style button. Add a <button> version (with a `loading` prop) in SOF-32.
export function ButtonLink({ href, variant = "primary", children }: Props) {
  return (
    <Link href={href} className={`${base} ${variants[variant]}`}>
      {children}
    </Link>
  );
}
