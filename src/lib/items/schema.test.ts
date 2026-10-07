import { describe, expect, it } from "vitest";

import { MAX_PAGE_SIZE, createItemSchema, itemSearchSchema, updateItemSchema } from "./schema";

const validItem = {
  type: "FOUND",
  title: "Grey flask",
  description: "Found on the library steps.",
  categoryId: "cat_1",
  locationId: "loc_1",
  dateLostOrFound: "2026-10-01",
};

describe("itemSearchSchema", () => {
  it("treats blank values as absent", () => {
    expect(itemSearchSchema.parse({ q: "  ", type: "", category: "", from: "", limit: "" })).toEqual({});
  });

  it("trims the search text and keeps valid filters", () => {
    expect(itemSearchSchema.parse({ q: "  black bag ", type: "LOST", from: "2026-10-01", sort: "oldest" })).toEqual({
      q: "black bag",
      type: "LOST",
      from: "2026-10-01",
      sort: "oldest",
    });
  });

  it("turns the limit into a number and caps it", () => {
    expect(itemSearchSchema.parse({ limit: "12" }).limit).toBe(12);
    expect(itemSearchSchema.parse({ limit: "500" }).limit).toBe(MAX_PAGE_SIZE);
  });

  it.each([
    ["an unknown type", { type: "GOLD" }],
    ["lower-case type", { type: "lost" }],
    ["the removed status", { status: "REMOVED" }],
    ["an unknown sort", { sort: "sideways" }],
    ["a date in the wrong format", { from: "01/10/2026" }],
    ["a date that does not exist", { to: "2026-13-45" }],
    ["a zero limit", { limit: "0" }],
    ["a fractional limit", { limit: "2.5" }],
    ["a limit that is not a number", { limit: "abc" }],
    ["a very long search", { q: "x".repeat(101) }],
  ])("rejects %s", (_label, query) => {
    expect(itemSearchSchema.safeParse(query).success).toBe(false);
  });
});

describe("createItemSchema", () => {
  it("accepts a valid item and defaults to no media", () => {
    const parsed = createItemSchema.parse(validItem);

    expect(parsed.mediaKeys).toEqual([]);
    expect(parsed.locationNote).toBeUndefined();
    expect(parsed.dateLostOrFound).toBeInstanceOf(Date);
  });

  it("trims text and treats a blank note as absent", () => {
    const parsed = createItemSchema.parse({ ...validItem, title: "  Grey flask  ", locationNote: "   " });

    expect(parsed.title).toBe("Grey flask");
    expect(parsed.locationNote).toBeUndefined();
  });

  it.each([
    ["a short title", { title: "ab" }],
    ["a short description", { description: "too short" }],
    ["an unknown type", { type: "STOLEN" }],
    ["a missing category", { categoryId: "" }],
    ["a missing location", { locationId: undefined }],
    ["a date in the future", { dateLostOrFound: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }],
    ["a date before the year 2000", { dateLostOrFound: "1999-12-31" }],
    ["a date that is not a date", { dateLostOrFound: "yesterday" }],
    ["more than five files", { mediaKeys: ["a", "b", "c", "d", "e", "f"] }],
    ["the same file twice", { mediaKeys: ["a", "a"] }],
    ["a field it does not know", { status: "RESOLVED" }],
    ["a poster id", { posterId: "usr_other" }],
  ])("rejects %s", (_label, override) => {
    expect(createItemSchema.safeParse({ ...validItem, ...override }).success).toBe(false);
  });

  it("allows today's date for a user whose clock is a few hours ahead", () => {
    const tomorrowMorning = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    expect(createItemSchema.safeParse({ ...validItem, dateLostOrFound: tomorrowMorning }).success).toBe(true);
  });
});

describe("updateItemSchema", () => {
  it("accepts a partial change", () => {
    expect(updateItemSchema.parse({ title: " New name " })).toEqual({ title: "New name" });
  });

  it("clears the note with null or a blank string", () => {
    expect(updateItemSchema.parse({ locationNote: null })).toEqual({ locationNote: null });
    expect(updateItemSchema.parse({ locationNote: "  " })).toEqual({ locationNote: null });
  });

  it.each([
    ["an empty change", {}],
    ["a status change", { status: "RESOLVED" }],
    ["a type change", { type: "LOST" }],
    ["a poster change", { posterId: "usr_other" }],
    ["media changes", { mediaKeys: ["a"] }],
    ["a short title", { title: "ab" }],
  ])("rejects %s", (_label, body) => {
    expect(updateItemSchema.safeParse(body).success).toBe(false);
  });
});
