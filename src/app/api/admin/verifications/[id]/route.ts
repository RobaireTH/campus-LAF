import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { verificationDecisionSchema } from "@/lib/moderation/schema";
import { decideVerification } from "@/lib/moderation/service";

export const PATCH = route<RouteContext<"/api/admin/verifications/[id]">>(async (request, ctx) => {
  const admin = await requireAdmin();
  const input = await parseBody(request, verificationDecisionSchema);
  const { id } = await ctx.params;
  return Response.json({ verification: await decideVerification(admin, id, input) });
});
