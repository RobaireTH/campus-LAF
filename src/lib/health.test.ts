import { afterEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import { databaseIsUp } from "./health";

vi.mock("@/lib/db", () => ({ db: { $queryRaw: vi.fn() } }));

const query = vi.mocked(db.$queryRaw);

afterEach(() => {
  vi.restoreAllMocks();
  query.mockReset();
});

describe("databaseIsUp", () => {
  it("is true when the database answers", async () => {
    query.mockResolvedValue([{ "?column?": 1 }] as never);

    expect(await databaseIsUp()).toBe(true);
  });

  it("is false, and logs without secrets, when the database cannot be reached", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    query.mockRejectedValue(new Error("connect ECONNREFUSED postgresql://user:hunter2@db.example.com/app"));

    expect(await databaseIsUp()).toBe(false);
    expect(JSON.stringify(logged.mock.calls)).not.toContain("hunter2");
  });
});
