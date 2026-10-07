import { z } from "zod";

export const verificationRequestSchema = z.object({
  key: z.string().min(1, "Upload a photo of your school ID first.").max(200, "That file name is too long."),
});
