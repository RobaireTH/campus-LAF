import { describe, expect, it } from "vitest";

import { verificationDecisionSchema } from "./schema";
import {
  REJECTION_NOTE_MAX,
  REJECTION_REASONS,
  REJECTION_REASON_MAX,
  composeRejectionReason,
  type RejectionReasonValue,
} from "./reasons";

describe("composeRejectionReason", () => {
  it("uses the sentence of the quick reason on its own", () => {
    expect(composeRejectionReason("expired", "")).toBe("The ID has expired.");
  });

  it("adds the note after the quick reason", () => {
    expect(composeRejectionReason("cropped", "  The bottom edge is missing. ")).toBe(
      "Part of the ID is cut off. The bottom edge is missing.",
    );
  });

  it("uses the note alone for something else", () => {
    expect(composeRejectionReason("other", "Photo of a screen, not the card.")).toBe("Photo of a screen, not the card.");
  });

  it("needs a note when the reason is something else", () => {
    expect(composeRejectionReason("other", "")).toBeNull();
    expect(composeRejectionReason("other", "   ")).toBeNull();
  });

  it("needs a reason to be chosen", () => {
    expect(composeRejectionReason(undefined, "Some note")).toBeNull();
    expect(composeRejectionReason("nonsense" as RejectionReasonValue, "")).toBeNull();
  });

  it("refuses a result longer than the API accepts", () => {
    expect(composeRejectionReason("other", "x".repeat(REJECTION_REASON_MAX + 1))).toBeNull();
    expect(composeRejectionReason("other", "x".repeat(REJECTION_REASON_MAX))).toHaveLength(REJECTION_REASON_MAX);
  });
});

describe("the quick reasons", () => {
  it("have unique values and labels", () => {
    expect(new Set(REJECTION_REASONS.map((reason) => reason.value)).size).toBe(REJECTION_REASONS.length);
    expect(new Set(REJECTION_REASONS.map((reason) => reason.label)).size).toBe(REJECTION_REASONS.length);
  });

  it("leave room for a full-length note", () => {
    for (const reason of REJECTION_REASONS) {
      expect(reason.message.length + 1 + REJECTION_NOTE_MAX, reason.value).toBeLessThanOrEqual(REJECTION_REASON_MAX);
    }
  });

  it("always produce a reason the API accepts", () => {
    for (const reason of REJECTION_REASONS) {
      const composed = composeRejectionReason(reason.value, "n".repeat(REJECTION_NOTE_MAX));
      expect(composed, reason.value).not.toBeNull();
      expect(verificationDecisionSchema.safeParse({ decision: "REJECT", reason: composed }).success, reason.value).toBe(true);
    }
  });
});
