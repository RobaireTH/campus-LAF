import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { getDashboard } from "@/lib/mock/dashboard";

// Shared shell for Browse, Dashboard, Account and the post-item screens.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await getDashboard(); // TODO: replace with a session/user call in SOF-19

  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream">
      <AppHeader user={user} />
      <main className="px-5 pb-32 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
