import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";
import { reportDecisionSchema } from "@/lib/moderation/schema";
import { decideReport } from "@/lib/moderation/service";

export const PATCH = route<RouteContext<"/api/admin/reports/[id]">>(async (request, ctx) => {
  const admin = await requireAdmin();
  const { decision } = await parseBody(request, reportDecisionSchema);
  const { id } = await ctx.params;
  return Response.json({ report: await decideReport(admin, id, decision) });
});
