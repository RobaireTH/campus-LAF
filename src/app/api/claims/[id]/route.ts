import { assertVerified, requireUser } from "@/lib/auth";
import { claimDecisionSchema } from "@/lib/claims/schema";
import { decideClaim } from "@/lib/claims/service";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const PATCH = route<RouteContext<"/api/claims/[id]">>(async (request, ctx) => {
  const user = await requireUser();
  const { decision } = await parseBody(request, claimDecisionSchema);
  if (decision === "APPROVE") assertVerified(user);
  const { id } = await ctx.params;
  return Response.json({ claim: await decideClaim(user, id, decision) });
});
