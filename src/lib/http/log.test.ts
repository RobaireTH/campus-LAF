import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, logError, redact } from "./log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact", () => {
  it.each([
    ["a postgres url", "connect failed for postgresql://user:hunter2@db.example.com/app?sslmode=require", "hunter2"],
    ["a postgres url with the short scheme", "postgres://user:hunter2@db.example.com/app", "hunter2"],
    ["a session cookie", "headers were cookie: findr_session=abc123def; theme=dark", "abc123def"],
    ["a bare session cookie value", "set findr_session=abc123def now", "abc123def"],
    ["an authorization header", "Authorization: Bearer abc.def.ghi", "abc.def.ghi"],
    ["a json password", '{"email":"a@b.co","password":"hunter2"}', "hunter2"],
    ["a query token", "GET /reset?token=s3cr3t&next=/", "s3cr3t"],
    ["a secret key", "R2 secret = shhh-value", "shhh-value"],
  ])("masks %s", (_label, text, secret) => {
    const cleaned = redact(text);

    expect(cleaned).not.toContain(secret);
    expect(cleaned).toContain("[redacted]");
  });

  it("leaves ordinary text alone", () => {
    expect(redact("Unique constraint failed on the fields: (`email`)")).toBe(
      "Unique constraint failed on the fields: (`email`)",
    );
  });
});

describe("describeError", () => {
  it("keeps the stack and the error code, with secrets masked", () => {
    const error = Object.assign(new Error("cannot reach postgresql://user:hunter2@db.example.com/app"), { code: "P1001" });

    const description = describeError(error);

    expect(description).toContain("Error: cannot reach");
    expect(description).toContain("[P1001]");
    expect(description).not.toContain("hunter2");
  });

  it("describes things that are not errors, with secrets masked", () => {
    expect(describeError("plain failure")).toBe("plain failure");
    expect(describeError("failed with token=abc123")).not.toContain("abc123");
  });
});

describe("logError", () => {
  it("logs the label and the masked description", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logError("POST /api/example", new Error("cookie: findr_session=abc123"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("POST /api/example");
    expect(String(spy.mock.calls[0][1])).not.toContain("abc123");
  });
});
