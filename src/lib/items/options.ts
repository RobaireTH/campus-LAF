import type { Option } from "./types";

const LAST_LABEL = "Other";

export function toOptions(rows: { id: string; name: string }[]): Option[] {
  const options = rows.map((row) => ({ value: row.id, label: row.name }));
  return [
    ...options.filter((option) => option.label !== LAST_LABEL),
    ...options.filter((option) => option.label === LAST_LABEL),
  ];
}
