import { requireUser } from "@/lib/auth";
import { listMyClaims } from "@/lib/claims/service";
import { route } from "@/lib/http/route";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ claims: await listMyClaims(user) });
});
