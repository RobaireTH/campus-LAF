import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http/route";

export const GET = route(async () => Response.json({ user: await requireUser() }));
