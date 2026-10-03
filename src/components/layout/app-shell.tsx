import * as React from "react";

import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { ShellUser } from "@/components/layout/nav-config";

/**
 * App chrome for every signed-in-or-public page: top nav + content + mobile bottom nav.
 * Use it in a route-group layout, e.g. src/app/(app)/layout.tsx:
 *
 *   export default async function AppLayout({ children }) {
 *     const user = await getShellUser(); // from the session once SOF-40 lands
 *     return <AppShell user={user}>{children}</AppShell>;
 *   }
 *
 * Put each page's content in <PageContainer>. Auth pages (login/register) skip the shell.
 */
export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <TopNav user={user} />
      <div id="content" className="flex flex-1 flex-col">
        {children}
      </div>
      <BottomNav user={user} />
    </div>
  );
}
