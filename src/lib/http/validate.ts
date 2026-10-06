import { z } from "zod";

import { badRequest, type FieldErrors } from "./errors";

function validate<Schema extends z.ZodType>(schema: Schema, value: unknown): z.output<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = z.flattenError(result.error).fieldErrors as FieldErrors;
    throw badRequest(result.error.issues[0]?.message ?? "Invalid input.", fields);
  }
  return result.data;
}

export async function parseBody<Schema extends z.ZodType>(request: Request, schema: Schema) {
  return validate(schema, await request.json().catch(() => undefined));
}

export function parseQuery<Schema extends z.ZodType>(request: Request, schema: Schema) {
  return validate(schema, Object.fromEntries(new URL(request.url).searchParams));
}
