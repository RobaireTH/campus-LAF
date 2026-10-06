export function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-4">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm leading-tight text-muted">{label}</p>
    </div>
  );
}
