import { forbidden } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originHost(origin: string) {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}

export function assertSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin === null) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || originHost(origin) !== host) throw forbidden("Cross-origin request blocked.");
}
