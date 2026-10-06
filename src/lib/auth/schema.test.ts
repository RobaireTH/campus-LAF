import { describe, expect, it } from "vitest";

import { loginSchema, normalizePhone, registerSchema } from "./schema";

const valid = { name: "Ada Okafor", email: "ada@school.edu", phone: "0801 234 5678", password: "long-enough-password" };

describe("normalizePhone", () => {
  it.each([
    ["0801 234 5678", "+2348012345678"],
    ["08012345678", "+2348012345678"],
    ["(0801) 234-5678", "+2348012345678"],
    ["+234 801 234 5678", "+2348012345678"],
    ["2348012345678", "+2348012345678"],
    ["002348012345678", "+2348012345678"],
    ["+1 415 555 0100", "+14155550100"],
    ["123", "123"],
  ])("turns %s into %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("registerSchema", () => {
  it("trims and normalises what it accepts", () => {
    const parsed = registerSchema.parse({ ...valid, name: "  Ada Okafor ", email: "  ADA@School.edu " });

    expect(parsed).toEqual({
      name: "Ada Okafor",
      email: "ada@school.edu",
      phone: "+2348012345678",
      password: "long-enough-password",
    });
  });

  it.each([
    ["a one-letter name", { name: "A" }],
    ["an invalid email", { email: "nope" }],
    ["a phone number that is too short", { phone: "123" }],
    ["a short password", { password: "short" }],
    ["an enormous password", { password: "x".repeat(129) }],
  ])("rejects %s", (_label, override) => {
    expect(registerSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("lower-cases the email and requires a password", () => {
    expect(loginSchema.parse({ email: "ADA@school.edu", password: "x" })).toEqual({
      email: "ada@school.edu",
      password: "x",
    });
    expect(loginSchema.safeParse({ email: "ada@school.edu", password: "" }).success).toBe(false);
  });
});
