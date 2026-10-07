import { describe, expect, it } from "vitest";

import { toOptions } from "./options";

describe("toOptions", () => {
  it("uses the id as the value and the name as the label", () => {
    expect(toOptions([{ id: "cat_1", name: "Keys" }])).toEqual([{ value: "cat_1", label: "Keys" }]);
  });

  it("keeps the given order but puts Other last", () => {
    const rows = [
      { id: "a", name: "Bags" },
      { id: "b", name: "Other" },
      { id: "c", name: "Keys" },
    ];

    expect(toOptions(rows).map((option) => option.label)).toEqual(["Bags", "Keys", "Other"]);
  });

  it("handles an empty list", () => {
    expect(toOptions([])).toEqual([]);
  });
});
