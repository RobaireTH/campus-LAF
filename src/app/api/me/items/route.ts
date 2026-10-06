import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http/route";

export const GET = route(async () => {
  const user = await requireUser();
  const items = await db.item.findMany({
    where: { posterId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      eventDate: true,
      createdAt: true,
      _count: { select: { claims: true } },
    },
  });
  return Response.json({
    items: items.map(({ _count, ...item }) => ({ ...item, claimCount: _count.claims })),
  });
});
