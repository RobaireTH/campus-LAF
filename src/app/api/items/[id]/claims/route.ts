import { requireUser, requireVerified } from "@/lib/auth";
import { CLAIM_CREATE_LIMIT } from "@/lib/claims/limits";
import { claimRequestSchema } from "@/lib/claims/schema";
import { listItemClaims } from "@/lib/claims/service";
import { submitClaim } from "@/lib/claims/submit";
import { ApiError } from "@/lib/http/errors";
import { withIdempotency } from "@/lib/http/idempotency";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const GET = route<RouteContext<"/api/items/[id]/claims">>(async (_request, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return Response.json({ claims: await listItemClaims(user, id) });
});

export const POST = route<RouteContext<"/api/items/[id]/claims">>(async (request, ctx) => {
  const user = await requireVerified();
  return withIdempotency(request, user.id, async () => {
    const input = await parseBody(request, claimRequestSchema);
    await consumeRateLimit(`claim:create:${user.id}`, CLAIM_CREATE_LIMIT);
    const { id } = await ctx.params;
    const result = await submitClaim(id, user, input);
    if (!result.ok) throw new ApiError(result.status, result.error);
    return Response.json(result.claim, { status: 201 });
  });
});
