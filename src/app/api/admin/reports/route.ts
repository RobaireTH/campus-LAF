import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http/route";
import { listReports } from "@/lib/moderation/service";

export const GET = route(async () => {
  await requireAdmin();
  return Response.json({ reports: await listReports() });
});
