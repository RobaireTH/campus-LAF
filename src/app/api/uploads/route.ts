import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createUploadUrl } from "@/lib/uploads/r2";
import { uploadRequestSchema } from "@/lib/uploads/schema";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to upload files." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid upload request.", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const upload = await createUploadUrl(parsed.data, user.id);
  return Response.json(upload, { status: 201 });
}
