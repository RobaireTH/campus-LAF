import { describe, expect, it } from "vitest";

import {
  adminItemSearchSchema,
  reportDecisionSchema,
  reportRequestSchema,
  verificationDecisionSchema,
} from "./schema";

describe("reportRequestSchema", () => {
  it.each(["spam", "fake", "personal", "offensive", "other"])("accepts the reason %s", (reason) => {
    expect(reportRequestSchema.parse({ reason })).toEqual({ reason });
  });

  it("trims details and treats blank details as absent", () => {
    expect(reportRequestSchema.parse({ reason: "spam", details: "  Looks like an advert  " }).details).toBe(
      "Looks like an advert",
    );
    expect(reportRequestSchema.parse({ reason: "spam", details: "   " })).toEqual({ reason: "spam" });
  });

  it.each([
    ["a missing reason", {}],
    ["an unknown reason", { reason: "rude" }],
    ["upper case", { reason: "SPAM" }],
    ["very long details", { reason: "spam", details: "x".repeat(501) }],
    ["a field it does not know", { reason: "spam", itemId: "itm_1" }],
  ])("rejects %s", (_label, body) => {
    expect(reportRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("verificationDecisionSchema", () => {
  it("accepts an approval and a rejection with or without a note", () => {
    expect(verificationDecisionSchema.parse({ decision: "APPROVE" })).toEqual({ decision: "APPROVE" });
    expect(verificationDecisionSchema.parse({ decision: "REJECT" })).toEqual({ decision: "REJECT" });
    expect(verificationDecisionSchema.parse({ decision: "REJECT", reason: "  Blurry photo " })).toEqual({
      decision: "REJECT",
      reason: "Blurry photo",
    });
    expect(verificationDecisionSchema.parse({ decision: "REJECT", reason: "  " })).toEqual({ decision: "REJECT" });
  });

  it.each([
    ["a missing decision", {}],
    ["lower case", { decision: "approve" }],
    ["another word", { decision: "ACCEPT" }],
    ["a note on an approval", { decision: "APPROVE", reason: "Looks good" }],
    ["a very long note", { decision: "REJECT", reason: "x".repeat(201) }],
    ["an extra field", { decision: "APPROVE", status: "VERIFIED" }],
  ])("rejects %s", (_label, body) => {
    expect(verificationDecisionSchema.safeParse(body).success).toBe(false);
  });
});

describe("reportDecisionSchema", () => {
  it.each(["DISMISS", "REMOVE_ITEM"])("accepts %s", (decision) => {
    expect(reportDecisionSchema.parse({ decision })).toEqual({ decision });
  });

  it.each([
    ["a missing decision", {}],
    ["another word", { decision: "REMOVE" }],
    ["an extra field", { decision: "DISMISS", note: "fine" }],
  ])("rejects %s", (_label, body) => {
    expect(reportDecisionSchema.safeParse(body).success).toBe(false);
  });
});

describe("adminItemSearchSchema", () => {
  it("allows any status, including removed, and caps the limit", () => {
    expect(adminItemSearchSchema.parse({ status: "REMOVED", limit: "900" })).toEqual({ status: "REMOVED", limit: 50 });
  });

  it("treats blank values as absent", () => {
    expect(adminItemSearchSchema.parse({ q: " ", status: "", type: "" })).toEqual({});
  });

  it.each([
    ["an unknown status", { status: "ALL" }],
    ["an unknown type", { type: "GOLD" }],
    ["a zero limit", { limit: "0" }],
  ])("rejects %s", (_label, query) => {
    expect(adminItemSearchSchema.safeParse(query).success).toBe(false);
  });
});
