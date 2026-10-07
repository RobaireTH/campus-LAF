export const REJECTION_REASON_MAX = 200;
export const REJECTION_NOTE_MAX = 150;

export const REJECTION_REASONS = [
  { value: "blurry", label: "Photo is blurry or dark", message: "The photo is too blurry or dark to read." },
  { value: "cropped", label: "ID is cut off", message: "Part of the ID is cut off." },
  { value: "not-student-id", label: "Not a student ID", message: "This is not a student ID card." },
  { value: "expired", label: "ID has expired", message: "The ID has expired." },
  { value: "name-mismatch", label: "Name does not match", message: "The name does not match your account." },
  { value: "other", label: "Something else", message: "" },
] as const;

export type RejectionReasonValue = (typeof REJECTION_REASONS)[number]["value"];

export function composeRejectionReason(value: RejectionReasonValue | undefined, note: string): string | null {
  const choice = REJECTION_REASONS.find((reason) => reason.value === value);
  if (!choice) return null;
  const composed = [choice.message, note.trim()].filter(Boolean).join(" ");
  return composed.length > 0 && composed.length <= REJECTION_REASON_MAX ? composed : null;
}
