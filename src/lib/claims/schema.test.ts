import { describe, expect, it } from "vitest";

import { claimDecisionSchema, handoverActionSchema } from "./schema";

describe("claimDecisionSchema", () => {
  it.each(["APPROVE", "REJECT"])("accepts %s", (decision) => {
    expect(claimDecisionSchema.parse({ decision })).toEqual({ decision });
  });

  it.each([
    ["a missing decision", {}],
    ["lower case", { decision: "approve" }],
    ["another word", { decision: "ACCEPT" }],
    ["an extra field", { decision: "APPROVE", status: "APPROVED" }],
  ])("rejects %s", (_label, body) => {
    expect(claimDecisionSchema.safeParse(body).success).toBe(false);
  });
});

describe("handoverActionSchema", () => {
  it.each(["COMPLETE", "CANCEL"])("accepts %s", (action) => {
    expect(handoverActionSchema.parse({ action })).toEqual({ action });
  });

  it.each([
    ["a missing action", {}],
    ["lower case", { action: "complete" }],
    ["another word", { action: "RESOLVE" }],
    ["an extra field", { action: "CANCEL", code: "ABC234" }],
  ])("rejects %s", (_label, body) => {
    expect(handoverActionSchema.safeParse(body).success).toBe(false);
  });
});
