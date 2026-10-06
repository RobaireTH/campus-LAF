import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "@/lib/http/errors";
import { route } from "@/lib/http/route";

export const GET = route<RouteContext<"/api/items/[id]">>(async (_request, ctx) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const item = await db.item.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      locationNote: true,
      status: true,
      eventDate: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      media: {
        orderBy: { position: "asc" },
        select: { key: true, type: true, position: true },
      },
      posterId: true,
      poster: { select: { name: true } },
    },
  });
  if (!item) throw notFound("Item not found");

  const existingClaim = user
    ? await db.claim.findFirst({ where: { itemId: id, claimantId: user.id }, select: { id: true } })
    : null;

  const { posterId, poster, ...rest } = item;
  return Response.json({
    item: {
      ...rest,
      posterName: poster.name ?? "Anonymous",
      isOwner: user?.id === posterId,
      hasClaimed: Boolean(existingClaim),
    },
  });
});
