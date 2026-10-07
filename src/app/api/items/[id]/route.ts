import { getCurrentUser, requireUser } from "@/lib/auth";
import { notFound } from "@/lib/http/errors";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { updateItemSchema } from "@/lib/items/schema";
import { getItemDetail, removeItem, updateItem } from "@/lib/items/service";

export const GET = route<RouteContext<"/api/items/[id]">>(async (_request, ctx) => {
  const { id } = await ctx.params;
  const item = await getItemDetail(id, await getCurrentUser());
  if (!item) throw notFound("Item not found");
  return Response.json({ item });
});

export const PATCH = route<RouteContext<"/api/items/[id]">>(async (request, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = await parseBody(request, updateItemSchema);
  return Response.json({ item: await updateItem(user, id, input) });
});

export const DELETE = route<RouteContext<"/api/items/[id]">>(async (_request, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return Response.json({ item: await removeItem(user, id) });
});
