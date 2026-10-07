import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { listMyItems } from "@/lib/items/service";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ items: await listMyItems(user) });
});
