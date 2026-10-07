import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { removeItemAsAdmin } from "@/lib/moderation/service";

export const PATCH = route<RouteContext<"/api/admin/items/[id]/remove">>(async (_request, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  return Response.json({ item: await removeItemAsAdmin(admin, id) });
});
