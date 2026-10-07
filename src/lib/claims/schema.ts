import { z } from "zod";

export const MAX_CLAIM_MEDIA = 5;

export const claimRequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Describe the item in at least 10 characters.")
    .max(2000, "Keep the description under 2000 characters."),
  mediaKeys: z
    .array(z.string())
    .max(MAX_CLAIM_MEDIA, `Attach at most ${MAX_CLAIM_MEDIA} files.`)
    .refine((keys) => new Set(keys).size === keys.length, "Each file can only be attached once.")
    .default([]),
});

export const claimDecisionSchema = z
  .object({ decision: z.enum(["APPROVE", "REJECT"], "Decision must be APPROVE or REJECT.") })
  .strict();

export const handoverActionSchema = z
  .object({ action: z.enum(["COMPLETE", "CANCEL"], "Action must be COMPLETE or CANCEL.") })
  .strict();

export type ClaimRequest = z.infer<typeof claimRequestSchema>;
export type ClaimDecision = z.output<typeof claimDecisionSchema>["decision"];
export type HandoverAction = z.output<typeof handoverActionSchema>["action"];

export interface ClaimResponse {
  id: string;
  status: "PENDING";
  createdAt: string;
}
