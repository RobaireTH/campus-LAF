import { describe, expect, it } from "vitest";

import { itemSearchSchema } from "./schema";
import { buildItemWhere } from "./where";

const where = (query: Record<string, string>) => buildItemWhere(itemSearchSchema.parse(query));

describe("buildItemWhere", () => {
  it("defaults to open items and no other filter", () => {
    expect(where({})).toEqual({ status: "OPEN" });
  });

  it("applies the simple filters", () => {
    expect(where({ type: "LOST", category: "cat_1", location: "loc_1", status: "CLAIMED" })).toEqual({
      status: "CLAIMED",
      type: "LOST",
      categoryId: "cat_1",
      locationId: "loc_1",
    });
  });

  it("covers the whole last day of a date range", () => {
    expect(where({ from: "2026-10-02", to: "2026-10-03" }).eventDate).toEqual({
      gte: new Date("2026-10-02T00:00:00.000Z"),
      lt: new Date("2026-10-04T00:00:00.000Z"),
    });
  });

  it("supports a range with only one end", () => {
    expect(where({ from: "2026-10-02" }).eventDate).toEqual({ gte: new Date("2026-10-02T00:00:00.000Z") });
    expect(where({ to: "2026-10-31" }).eventDate).toEqual({ lt: new Date("2026-11-01T00:00:00.000Z") });
  });

  it("requires every search word to match one of the text fields", () => {
    const { AND } = where({ q: "blue  umbrella" });

    expect(AND).toHaveLength(2);
    const [first] = AND as { OR: object[] }[];
    expect(first.OR).toEqual([
      { title: { contains: "blue", mode: "insensitive" } },
      { description: { contains: "blue", mode: "insensitive" } },
      { locationNote: { contains: "blue", mode: "insensitive" } },
      { category: { name: { contains: "blue", mode: "insensitive" } } },
      { location: { name: { contains: "blue", mode: "insensitive" } } },
    ]);
  });

  it("escapes the characters that act as wildcards in a text match", () => {
    const [first] = where({ q: "100%_a\\b" }).AND as { OR: { title: { contains: string } }[] }[];

    expect(first.OR[0].title.contains).toBe("100\\%\\_a\\\\b");
  });

  it("looks at no more than five words", () => {
    expect(where({ q: "a b c d e f g" }).AND).toHaveLength(5);
  });

  it("adds no text condition for an empty search", () => {
    expect(where({ q: "   " })).not.toHaveProperty("AND");
  });
});
