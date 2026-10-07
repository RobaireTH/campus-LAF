import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { parseQuery } from "@/lib/http/validate";
import { adminItemSearchSchema } from "@/lib/moderation/schema";
import { listAdminItems } from "@/lib/moderation/service";

export const GET = route(async (request) => {
  await requireAdmin();
  return Response.json(await listAdminItems(parseQuery(request, adminItemSearchSchema)));
});
