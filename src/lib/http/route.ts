import { Prisma } from "@/generated/prisma/client";

import { ApiError } from "./errors";
import { logError } from "./log";
import { assertSameOrigin } from "./origin";

type Handler<Context> = (request: Request, context: Context) => Response | Promise<Response>;

const UNAVAILABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

function codeOf(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function isDatabaseUnavailable(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const cause = typeof error === "object" && error !== null && "cause" in error ? error.cause : undefined;
  const code = codeOf(error) ?? codeOf(cause);
  return code !== undefined && UNAVAILABLE_CODES.has(code);
}

export function errorResponse(error: unknown, context = "request") {
  if (error instanceof ApiError) {
    const body = error.fields ? { error: error.message, fields: error.fields } : { error: error.message };
    return Response.json(body, { status: error.status, headers: error.headers });
  }
  const unavailable = isDatabaseUnavailable(error);
  logError(`${unavailable ? "Database unavailable" : "Unhandled API error"} (${context})`, error);
  return unavailable
    ? Response.json({ error: "Database unavailable" }, { status: 503 })
    : Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

export function route<Context = unknown>(handler: Handler<Context>): Handler<Context> {
  return async (request, context) => {
    let response: Response;
    try {
      assertSameOrigin(request);
      response = await handler(request, context);
    } catch (error) {
      response = errorResponse(error, `${request.method} ${new URL(request.url).pathname}`);
    }
    if (!response.headers.has("Cache-Control")) response.headers.set("Cache-Control", "no-store");
    return response;
  };
}
