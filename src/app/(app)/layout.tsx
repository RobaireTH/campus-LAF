import * as React from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getShellUser } from "@/lib/session";

/** Pages inside (app) get the top nav + mobile bottom nav. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getShellUser();
  return <AppShell user={user}>{children}</AppShell>;
}
