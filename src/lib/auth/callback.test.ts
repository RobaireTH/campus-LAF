import { describe, expect, it } from "vitest";

import { safeCallbackPath } from "./callback";

describe("safeCallbackPath", () => {
  it.each(["/", "/dashboard", "/items/abc?tab=claims", "/items/abc#proof", "/items/abc?x=1&y=2#top", "/%5Cnot-a-host"])(
    "keeps the local path %s",
    (path) => {
      expect(safeCallbackPath(path)).toBe(path);
    },
  );

  it.each([
    ["a missing value", undefined],
    ["null", null],
    ["a number", 42],
    ["a list", ["/dashboard"]],
    ["an empty string", ""],
    ["a relative path", "dashboard"],
    ["a path with a leading space", " /dashboard"],
    ["an absolute http url", "http://evil.example/steal"],
    ["an absolute https url", "https://evil.example"],
    ["a javascript url", "javascript:alert(1)"],
    ["a protocol-relative url", "//evil.example"],
    ["a backslash host", "/\\evil.example"],
    ["a doubled backslash host", "/\\\\evil.example"],
    ["a tab inside the slashes", "/\t/evil.example"],
    ["a newline inside the slashes", "/\n/evil.example"],
    ["three slashes", "///evil.example"],
    ["a slash then a backslash then a slash", "/\\/evil.example"],
    ["a malformed host", "//[::1"],
  ])("falls back for %s", (_label, value) => {
    expect(safeCallbackPath(value)).toBe("/");
  });

  it("uses the fallback it is given", () => {
    expect(safeCallbackPath("//evil.example", "/dashboard")).toBe("/dashboard");
  });

  it("strips control characters the browser would ignore", () => {
    expect(safeCallbackPath("/da\tsh\nboard")).toBe("/dashboard");
  });
});
