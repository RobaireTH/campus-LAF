"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { isActive, mainNav, routes, type ShellUser } from "@/components/layout/nav-config";

/**
 * Phone-only bottom tab bar (hidden from `md`). "Report" is the raised centre button.
 * Signed-out visitors still see it; protected tabs send them to login via the page guard.
 */
export function BottomNav({ user }: { user: ShellUser | null }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-bottom-nav max-w-md items-stretch justify-around px-2">
        {mainNav.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          const href = !user && item.href !== "/" ? `${routes.login}?callbackUrl=${encodeURIComponent(item.href)}` : item.href;

          if (item.href === routes.report) {
            return (
              <li key={item.href} className="flex items-center">
                <Link
                  href={href}
                  aria-label="Report an item"
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop ring-4 ring-background transition-colors outline-none hover:bg-primary-hover focus-visible:ring-ring/50"
                >
                  <Icon className="size-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-caption font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
