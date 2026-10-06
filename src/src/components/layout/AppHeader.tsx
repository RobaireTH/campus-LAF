import type { CurrentUser } from "@/lib/types";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="flex items-center justify-between px-5 pt-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand font-bold text-white">
          f
        </span>
        <span className="text-xl font-bold text-ink">findr</span>
      </div>
      <div className="relative">
        <span className="flex size-10 items-center justify-center rounded-full bg-badge-amber-bg text-sm font-semibold text-ink">
          {user.initials}
        </span>
        {user.verified && (
          <span
            aria-label="Verified"
            className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-banner-fg text-[10px] text-white"
          >
            ✓
          </span>
        )}
      </div>
    </header>
  );
}
