import { z } from "zod";

import { optional } from "@/lib/http/fields";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/items/schema";

import { REJECTION_REASON_MAX } from "./reasons";

export const REPORT_REASONS = {
  spam: "Spam or advertising",
  fake: "Looks fake or misleading",
  personal: "Shows someone's private details",
  offensive: "Offensive content",
  other: "Something else",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

const reasonCodes = Object.keys(REPORT_REASONS) as [ReportReason, ...ReportReason[]];

export const reportRequestSchema = z
  .object({
    reason: z.enum(reasonCodes, "Pick a reason."),
    details: optional(z.string().trim().max(500, "Keep the details under 500 characters.")),
  })
  .strict();

export const verificationDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"], "Decision must be APPROVE or REJECT."),
    reason: optional(z.string().trim().max(REJECTION_REASON_MAX, `Keep the reason under ${REJECTION_REASON_MAX} characters.`)),
  })
  .strict()
  .refine((value) => value.decision === "REJECT" || value.reason === undefined, "A reason only applies when rejecting.");

export const reportDecisionSchema = z
  .object({ decision: z.enum(["DISMISS", "REMOVE_ITEM"], "Decision must be DISMISS or REMOVE_ITEM.") })
  .strict();

export const adminItemSearchSchema = z.object({
  q: optional(z.string().trim().max(100, "Keep the search under 100 characters.")),
  type: optional(z.enum(["LOST", "FOUND"], "Type must be LOST or FOUND.")),
  status: optional(z.enum(["OPEN", "CLAIMED", "RESOLVED", "REMOVED"], "Status must be OPEN, CLAIMED, RESOLVED or REMOVED.")),
  cursor: optional(z.string().max(64)),
  limit: optional(
    z.coerce
      .number("Limit must be a number.")
      .int("Limit must be a whole number.")
      .min(1, "Limit must be at least 1.")
      .transform((value) => Math.min(value, MAX_PAGE_SIZE)),
  ),
});

export const ADMIN_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export type ReportRequest = z.output<typeof reportRequestSchema>;
export type VerificationDecision = z.output<typeof verificationDecisionSchema>;
export type ReportDecision = z.output<typeof reportDecisionSchema>["decision"];
export type AdminItemSearch = z.output<typeof adminItemSearchSchema>;
