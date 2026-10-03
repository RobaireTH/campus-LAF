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

export type ClaimRequest = z.infer<typeof claimRequestSchema>;

export interface ClaimResponse {
  id: string;
  status: "PENDING";
  createdAt: string;
}
