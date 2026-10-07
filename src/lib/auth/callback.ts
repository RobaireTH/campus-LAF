const SAME_ORIGIN = "http://same-origin.invalid";

export function safeCallbackPath(requested: unknown, fallback = "/") {
  if (typeof requested !== "string" || !requested.startsWith("/")) return fallback;
  try {
    const resolved = new URL(requested, SAME_ORIGIN);
    if (resolved.origin !== SAME_ORIGIN) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
