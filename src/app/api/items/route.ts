import { requireUser } from "@/lib/auth";
import { withIdempotency } from "@/lib/http/idempotency";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { parseBody, parseQuery } from "@/lib/http/validate";
import { ITEM_CREATE_LIMIT } from "@/lib/items/limits";
import { createItemSchema, itemSearchSchema } from "@/lib/items/schema";
import { createItem, searchItems } from "@/lib/items/service";

export const GET = route(async (request) => Response.json(await searchItems(parseQuery(request, itemSearchSchema))));

export const POST = route(async (request) => {
  const user = await requireUser();
  return withIdempotency(request, user.id, async () => {
    const input = await parseBody(request, createItemSchema);
    await consumeRateLimit(`item:create:${user.id}`, ITEM_CREATE_LIMIT);
    return Response.json({ item: await createItem(user, input) }, { status: 201 });
  });
});
