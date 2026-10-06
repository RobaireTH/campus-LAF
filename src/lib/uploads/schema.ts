import { z } from "zod";

export const UPLOAD_PURPOSES = ["item", "claim", "kyc"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const MB = 1024 * 1024;

export const UPLOAD_TYPES = {
  "image/jpeg": { ext: "jpg", kind: "IMAGE", maxBytes: 5 * MB },
  "image/png": { ext: "png", kind: "IMAGE", maxBytes: 5 * MB },
  "image/webp": { ext: "webp", kind: "IMAGE", maxBytes: 5 * MB },
  "video/mp4": { ext: "mp4", kind: "VIDEO", maxBytes: 25 * MB },
  "video/webm": { ext: "webm", kind: "VIDEO", maxBytes: 25 * MB },
} as const;

export type UploadContentType = keyof typeof UPLOAD_TYPES;

const contentTypes = Object.keys(UPLOAD_TYPES) as [UploadContentType, ...UploadContentType[]];

export const uploadRequestSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    contentType: z.enum(contentTypes),
    size: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    const rule = UPLOAD_TYPES[value.contentType];
    if (value.size > rule.maxBytes) {
      ctx.addIssue({
        code: "custom",
        path: ["size"],
        message: `File is too large. The limit is ${rule.maxBytes / MB} MB.`,
      });
    }
    if (value.purpose === "kyc" && rule.kind !== "IMAGE") {
      ctx.addIssue({
        code: "custom",
        path: ["contentType"],
        message: "ID verification only accepts photos.",
      });
    }
  });

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export interface UploadResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}
