import "server-only";

import type { ShellUser } from "@/components/layout/nav-config";
import { getCurrentUser } from "@/lib/auth";

export async function getShellUser(): Promise<ShellUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    name: user.name ?? user.email,
    image: user.image,
    verified: user.kycStatus === "VERIFIED",
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  };
}
