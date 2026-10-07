import { requireUser } from "@/lib/auth";
import { handoverActionSchema } from "@/lib/claims/schema";
import { getHandover, updateHandover } from "@/lib/claims/service";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const GET = route<RouteContext<"/api/claims/[id]/handover">>(async (_request, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return Response.json({ handover: await getHandover(user, id) });
});

export const PATCH = route<RouteContext<"/api/claims/[id]/handover">>(async (request, ctx) => {
  const user = await requireUser();
  const { action } = await parseBody(request, handoverActionSchema);
  const { id } = await ctx.params;
  return Response.json({ handover: await updateHandover(user, id, action) });
});
