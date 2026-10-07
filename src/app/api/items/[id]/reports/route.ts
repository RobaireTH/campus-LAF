import { requireUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { REPORT_CREATE_LIMIT } from "@/lib/moderation/limits";
import { reportRequestSchema } from "@/lib/moderation/schema";
import { createReport } from "@/lib/moderation/service";

export const POST = route<RouteContext<"/api/items/[id]/reports">>(async (request, ctx) => {
  const user = await requireUser();
  const input = await parseBody(request, reportRequestSchema);
  await consumeRateLimit(`report:create:${user.id}`, REPORT_CREATE_LIMIT);
  const { id } = await ctx.params;
  const { created, report } = await createReport(user, id, input);
  return Response.json({ report }, { status: created ? 201 : 200 });
});
