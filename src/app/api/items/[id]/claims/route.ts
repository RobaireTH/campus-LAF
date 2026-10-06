import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { claimRequestSchema } from "@/lib/claims/schema";
import { submitClaim } from "@/lib/claims/submit";

export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/claims">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to claim an item." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = claimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid claim.", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const result = await submitClaim(id, user, parsed.data);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.claim, { status: 201 });
}
