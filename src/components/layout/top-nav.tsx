"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { isActive, mainNav, routes, type ShellUser } from "@/components/layout/nav-config";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40", className)}>
      <Image src="/brand/findr-mark.png" alt="" width={36} height={36} className="size-9 object-contain" priority />
      <span className="font-display text-h3 tracking-tight">Findr</span>
    </Link>
  );
}

/**
 * Top bar. Desktop: logo, links, "Report an item", account. Phones: logo + account only
 * (navigation lives in <BottomNav>).
 */
export function TopNav({ user }: { user: ShellUser | null }) {
  const pathname = usePathname();
  const links = mainNav.filter((i) => i.href !== routes.report && (user || i.href === "/"));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-page items-center gap-6 px-gutter lg:px-gutter-lg">
        <Logo />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-small font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {user?.role === "ADMIN" && (
            <Link
              href={routes.admin}
              aria-current={pathname.startsWith(routes.admin) ? "page" : undefined}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-small font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href={routes.report}>
              <Plus /> Report an item
            </Link>
          </Button>
          {user ? (
            <Link
              href="/account"
              aria-label={`Account: ${user.name}`}
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <UserAvatar name={user.name} src={user.image} size="sm" verified={user.verified} />
            </Link>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.login}>Log in</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link href={routes.register}>Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
