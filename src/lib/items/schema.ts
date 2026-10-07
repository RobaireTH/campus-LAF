import { z } from "zod";

export const MAX_ITEM_MEDIA = 5;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const EARLIEST_DATE = Date.UTC(2000, 0, 1);

const blankToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

const optional = <Schema extends z.ZodType>(schema: Schema) => z.preprocess(blankToUndefined, schema.optional());

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format yyyy-MM-dd.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Enter a real date.");

export const itemSearchSchema = z.object({
  q: optional(z.string().trim().max(100, "Keep the search under 100 characters.")),
  type: optional(z.enum(["LOST", "FOUND"], "Type must be LOST or FOUND.")),
  category: optional(z.string().max(64)),
  location: optional(z.string().max(64)),
  from: optional(day),
  to: optional(day),
  status: optional(z.enum(["OPEN", "CLAIMED", "RESOLVED"], "Status must be OPEN, CLAIMED or RESOLVED.")),
  sort: optional(z.enum(["newest", "oldest"], "Sort must be newest or oldest.")),
  cursor: optional(z.string().max(64)),
  limit: optional(
    z.coerce
      .number("Limit must be a number.")
      .int("Limit must be a whole number.")
      .min(1, "Limit must be at least 1.")
      .transform((value) => Math.min(value, MAX_PAGE_SIZE)),
  ),
});

const dateLostOrFound = z.coerce
  .date("Enter a valid date.")
  .refine((date) => date.getTime() >= EARLIEST_DATE, "Enter a valid date.")
  .refine((date) => date.getTime() <= Date.now() + FUTURE_TOLERANCE_MS, "The date can't be in the future.");

const title = z.string().trim().min(3, "Use at least 3 characters.").max(120, "Keep the name under 120 characters.");

const description = z
  .string()
  .trim()
  .min(10, "Describe the item in at least 10 characters.")
  .max(2000, "Keep the description under 2000 characters.");

const categoryId = z.string().min(1, "Choose a category.").max(64);
const locationId = z.string().min(1, "Choose a campus location.").max(64);
const locationNote = z.string().trim().max(200, "Keep the note under 200 characters.");

export const createItemSchema = z
  .object({
    type: z.enum(["LOST", "FOUND"], "Choose lost or found."),
    title,
    description,
    categoryId,
    locationId,
    locationNote: optional(locationNote),
    dateLostOrFound,
    mediaKeys: z
      .array(z.string().min(1))
      .max(MAX_ITEM_MEDIA, `Attach at most ${MAX_ITEM_MEDIA} files.`)
      .refine((keys) => new Set(keys).size === keys.length, "Each file can only be attached once.")
      .default([]),
  })
  .strict();

export const updateItemSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    categoryId: categoryId.optional(),
    locationId: locationId.optional(),
    locationNote: z.preprocess(blankToNull, locationNote.nullable()).optional(),
    dateLostOrFound: dateLostOrFound.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Change at least one field.");

export type ItemSearch = z.output<typeof itemSearchSchema>;
export type CreateItemInput = z.output<typeof createItemSchema>;
export type UpdateItemInput = z.output<typeof updateItemSchema>;
