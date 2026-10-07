import { requireUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { UPLOAD_RATE_LIMIT } from "@/lib/uploads/limits";
import { createUploadUrl } from "@/lib/uploads/r2";
import { uploadRequestSchema } from "@/lib/uploads/schema";

export const POST = route(async (request) => {
  const user = await requireUser();
  await consumeRateLimit(`upload:${user.id}`, UPLOAD_RATE_LIMIT);
  const input = await parseBody(request, uploadRequestSchema);
  return Response.json(await createUploadUrl(input, user.id), { status: 201 });
});
