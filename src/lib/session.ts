import "server-only";

import type { ShellUser } from "@/components/layout/nav-config";

/**
 * TEMPORARY: returns the signed-in user for the app shell and page guards.
 * Replace the body with the NextAuth session lookup when SOF-40 lands, e.g.
 *
 *   const session = await getServerSession(authOptions);
 *   return session ? { name: session.user.name, image: session.user.image,
 *                      verified: session.user.kycStatus === "APPROVED", role: session.user.role } : null;
 */
export async function getShellUser(): Promise<ShellUser | null> {
  return null;
}
