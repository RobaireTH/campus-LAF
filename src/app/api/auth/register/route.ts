import { AUTH_LIMITS } from "@/lib/auth/limits";
import { registerSchema } from "@/lib/auth/schema";
import { registerUser } from "@/lib/auth/service";
import { createSession, withSessionCookie } from "@/lib/auth/session";
import { schedulePrune } from "@/lib/housekeeping";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { clientIp } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const POST = route(async (request) => {
  schedulePrune();
  await consumeRateLimit(`register:${clientIp(request)}`, AUTH_LIMITS.register.perIp);
  const input = await parseBody(request, registerSchema);
  const user = await registerUser(input);
  const session = await createSession(user.id);
  return withSessionCookie(Response.json({ user }, { status: 201 }), request, session);
});
