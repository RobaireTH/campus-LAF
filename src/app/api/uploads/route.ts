import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { createUploadUrl } from "@/lib/uploads/r2";
import { uploadRequestSchema } from "@/lib/uploads/schema";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, uploadRequestSchema);
  return Response.json(await createUploadUrl(input, user.id), { status: 201 });
});
