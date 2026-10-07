import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import { schedulePrune } from "./housekeeping";

vi.mock("next/server", () => ({ after: (task: () => unknown) => task() }));
vi.mock("@/lib/db", () => ({
  db: {
    session: { deleteMany: vi.fn() },
    rateLimit: { deleteMany: vi.fn() },
    idempotencyKey: { deleteMany: vi.fn() },
  },
}));

const HOUR_MS = 60 * 60 * 1000;

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(async () => {
  for (const table of [db.session, db.rateLimit, db.idempotencyKey]) {
    vi.mocked(table.deleteMany).mockReset().mockResolvedValue({ count: 0 });
  }
  await vi.advanceTimersByTimeAsync(10 * HOUR_MS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("schedulePrune", () => {
  it("prunes at most once an hour", async () => {
    schedulePrune();
    schedulePrune();
    await vi.advanceTimersByTimeAsync(HOUR_MS / 2);
    schedulePrune();

    expect(db.session.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.rateLimit.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.idempotencyKey.deleteMany).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HOUR_MS);
    schedulePrune();

    expect(db.session.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("logs a failure instead of throwing", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(db.session.deleteMany).mockRejectedValue(new Error("connection lost"));

    expect(() => schedulePrune()).not.toThrow();
    await vi.advanceTimersByTimeAsync(10);

    expect(logged).toHaveBeenCalledWith("Housekeeping failed", expect.stringContaining("connection lost"));
  });
});
