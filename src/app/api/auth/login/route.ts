import { AUTH_LIMITS } from "@/lib/auth/limits";
import { loginSchema } from "@/lib/auth/schema";
import { authenticate } from "@/lib/auth/service";
import { createSession, sha256, withSessionCookie } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { clientIp } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { parseBody } from "@/lib/http/validate";

export const POST = route(async (request) => {
  await consumeRateLimit(`login:ip:${clientIp(request)}`, AUTH_LIMITS.login.perIp);
  const { email, password } = await parseBody(request, loginSchema);
  await consumeRateLimit(`login:email:${sha256(email)}`, AUTH_LIMITS.login.perEmail);
  const user = await authenticate(email, password);
  const session = await createSession(user.id);
  return withSessionCookie(Response.json({ user }), request, session);
});
