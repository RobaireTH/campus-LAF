import type { ItemType } from "@/lib/types";

const styles: Record<ItemType, string> = {
  FOUND: "bg-found-bg text-found-fg",
  LOST: "bg-lost-bg text-lost-fg",
};

export function StatusChip({ type }: { type: ItemType }) {
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  );
}
