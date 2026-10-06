"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 text-sm ${
        active ? "font-medium text-brand" : "text-muted"
      }`}
    >
      {/* Placeholder icon. Swap for David's icon set. */}
      <span
        className={`size-4 border-2 ${active ? "rounded-sm border-brand" : "rounded-full border-muted"}`}
      />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const is = (href: string) => pathname.startsWith(href);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-cream"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 items-end px-2 pb-3 pt-2">
        <NavLink {...links[0]} active={is(links[0].href)} />
        <Link
          href="/post/new"
          aria-label="Report an item"
          className="mx-auto -mt-8 flex size-16 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg"
        >
          +
        </Link>
        <NavLink {...links[1]} active={is(links[1].href)} />
        <NavLink {...links[2]} active={is(links[2].href)} />
      </div>
    </nav>
  );
}
