import { describe, expect, it } from "vitest";

import { whatsappUrl } from "./contact";

describe("whatsappUrl", () => {
  it.each([
    ["+2348012345678", "https://wa.me/2348012345678"],
    ["+1 (415) 555-0100", "https://wa.me/14155550100"],
    ["2348012345678", "https://wa.me/2348012345678"],
  ])("turns %s into %s", (phone, expected) => {
    expect(whatsappUrl(phone)).toBe(expected);
  });
});
