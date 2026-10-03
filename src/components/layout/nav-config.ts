import { House, LayoutDashboard, Plus, UserRound, type LucideIcon } from "lucide-react";

/** Signed-in user as the shell needs it. Fill from the session (SOF-40). */
export interface ShellUser {
  name: string;
  image?: string | null;
  /** KYC approved (SOF-42) */
  verified: boolean;
  role?: "USER" | "ADMIN";
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also mark active on nested paths (e.g. /items/123 under Browse). */
  match?: string[];
}

/**
 * The app's main destinations — edit routes here in one place.
 * "Report" is rendered as the big centre button on mobile.
 */
export const mainNav: NavItem[] = [
  { href: "/", label: "Browse", icon: House, match: ["/items"] },
  { href: "/report", label: "Report", icon: Plus },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/my-posts", "/claims"] },
  { href: "/account", label: "Account", icon: UserRound, match: ["/verify"] },
];

export const routes = {
  login: "/login",
  register: "/register",
  verify: "/verify",
  report: "/report",
  admin: "/admin",
} as const;

export function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/" || (item.match ?? []).some((m) => pathname.startsWith(m));
  return [item.href, ...(item.match ?? [])].some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
