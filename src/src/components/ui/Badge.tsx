import type { ReactNode } from "react";

const tones = {
  blue: "bg-badge-blue-bg text-badge-blue-fg",
  amber: "bg-badge-amber-bg text-badge-amber-fg",
};

export function Badge({ tone = "blue", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
