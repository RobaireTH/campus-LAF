import { databaseIsUp } from "@/lib/health";
import { route } from "@/lib/http/route";

export const GET = route(async () =>
  (await databaseIsUp())
    ? Response.json({ status: "ok", database: "up" })
    : Response.json({ status: "degraded", database: "down" }, { status: 503 }),
);
