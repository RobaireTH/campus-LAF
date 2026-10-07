import { describe, expect, it } from "vitest";

import { generateHandoverCode } from "./code";

describe("generateHandoverCode", () => {
  it("makes six characters that are easy to read aloud", () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateHandoverCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("never uses characters that look alike", () => {
    const sample = Array.from({ length: 500 }, generateHandoverCode).join("");

    expect(sample).not.toMatch(/[01OI]/);
  });

  it("does not repeat in a sample of a thousand", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateHandoverCode));

    expect(codes.size).toBe(1000);
  });
});
