import { describe, expect, it } from "vitest";

import { parseSearchParams } from "./search-params";

describe("parseSearchParams", () => {
  it("reads every filter from the query", () => {
    expect(
      parseSearchParams({ q: "black bag", type: "found", category: "cat_1", location: "loc_1", from: "2026-10-01", to: "2026-10-07", sort: "oldest" }),
    ).toEqual({ q: "black bag", type: "FOUND", category: "cat_1", location: "loc_1", from: "2026-10-01", to: "2026-10-07", sort: "oldest" });
  });

  it("returns nothing for an empty query", () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      type: undefined,
      category: undefined,
      location: undefined,
      from: undefined,
      to: undefined,
      sort: undefined,
    });
  });

  it("trims values and treats blank ones as absent", () => {
    const params = parseSearchParams({ q: "  keys  ", category: "   ", location: "" });

    expect(params.q).toBe("keys");
    expect(params.category).toBeUndefined();
    expect(params.location).toBeUndefined();
  });

  it("takes the first value when a key repeats", () => {
    expect(parseSearchParams({ q: ["first", "second"] }).q).toBe("first");
  });

  it.each(["", "ALL", "gold", "lost found"])("ignores the type %j", (type) => {
    expect(parseSearchParams({ type }).type).toBeUndefined();
  });

  it("accepts the type in any case", () => {
    expect(parseSearchParams({ type: "lost" }).type).toBe("LOST");
  });

  it.each(["2026-1-1", "yesterday", "01/10/2026", "2026-10-01T10:00"])("ignores the date %j", (date) => {
    expect(parseSearchParams({ from: date, to: date })).toMatchObject({ from: undefined, to: undefined });
  });

  it("only keeps the oldest sort", () => {
    expect(parseSearchParams({ sort: "newest" }).sort).toBeUndefined();
    expect(parseSearchParams({ sort: "oldest" }).sort).toBe("oldest");
  });

  it("cuts overlong values so they cannot fail validation later", () => {
    const params = parseSearchParams({ q: "x".repeat(500), category: "y".repeat(500), location: "z".repeat(500) });

    expect(params.q).toHaveLength(100);
    expect(params.category).toHaveLength(64);
    expect(params.location).toHaveLength(64);
  });
});
