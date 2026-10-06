import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the original password and rejects any other", async () => {
    const hash = await hashPassword("correct-horse-battery");

    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    const [first, second] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);

    expect(first).not.toBe(second);
  });

  it("never accepts a malformed stored hash", async () => {
    for (const stored of ["", "plain", "scrypt$1$2$3", "bcrypt$a$b$c$d$e", "scrypt$x$y$z$AAAA$AAAA"]) {
      expect(await verifyPassword("anything", stored)).toBe(false);
    }
  });
});
