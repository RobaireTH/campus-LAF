import { z } from "zod";

export const blankToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

export const optional = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess(blankToUndefined, schema.optional());
