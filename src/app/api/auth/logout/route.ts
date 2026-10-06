import { cookies } from "next/headers";

import { SESSION_COOKIE, revokeSession, withClearedSessionCookie } from "@/lib/auth/session";
import { route } from "@/lib/http/route";

export const POST = route(async (request) => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  return withClearedSessionCookie(Response.json({ ok: true }), request);
});
