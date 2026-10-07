import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { verificationRequestSchema } from "@/lib/kyc/schema";
import { submitVerification } from "@/lib/kyc/service";

export const POST = route(async (request) => {
  const user = await requireUser();
  const { key } = await parseBody(request, verificationRequestSchema);
  return Response.json({ verification: await submitVerification(user.id, key) });
});
