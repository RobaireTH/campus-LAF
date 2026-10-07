import type { LucideIcon } from "lucide-react";

export function EmptyQueue({ icon: Icon, title, copy = "You are all caught up." }: { icon: LucideIcon; title: string; copy?: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
      <Icon className="mb-3 size-9 text-muted-foreground" aria-hidden />
      <h2 className="text-h3">{title}</h2>
      <p className="mt-1 text-small text-muted-foreground">{copy}</p>
    </div>
  );
}
