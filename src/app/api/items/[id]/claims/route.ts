import { requireUser } from "@/lib/auth";
import { claimRequestSchema } from "@/lib/claims/schema";
import { submitClaim } from "@/lib/claims/submit";
import { ApiError } from "@/lib/http/errors";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const POST = route<RouteContext<"/api/items/[id]/claims">>(async (request, ctx) => {
  const user = await requireUser();
  const input = await parseBody(request, claimRequestSchema);
  const { id } = await ctx.params;
  const result = await submitClaim(id, user, input);
  if (!result.ok) throw new ApiError(result.status, result.error);
  return Response.json(result.claim, { status: 201 });
});
