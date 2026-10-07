import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { pruneExpired } from "@/lib/housekeeping";

import { createUser } from "./support/factories";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

describe("pruneExpired", () => {
  it("deletes expired sessions, spent rate limits and old idempotency keys, and keeps the rest", async () => {
    const user = await createUser();
    const tag = randomUUID();
    const expiredSession = await db.session.create({ data: { userId: user.id, tokenHash: `expired-${tag}`, expiresAt: hoursFromNow(-1) } });
    const liveSession = await db.session.create({ data: { userId: user.id, tokenHash: `live-${tag}`, expiresAt: hoursFromNow(24) } });
    await db.rateLimit.createMany({
      data: [
        { key: `spent-${tag}`, count: 3, resetAt: hoursFromNow(-1) },
        { key: `running-${tag}`, count: 1, resetAt: hoursFromNow(1) },
      ],
    });
    await db.idempotencyKey.createMany({
      data: [
        { userId: user.id, key: `old-${tag}`, requestHash: "hash", createdAt: hoursFromNow(-25) },
        { userId: user.id, key: `recent-${tag}`, requestHash: "hash", createdAt: hoursFromNow(-23) },
      ],
    });

    await pruneExpired();

    expect(await db.session.findUnique({ where: { id: expiredSession.id } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: liveSession.id } })).not.toBeNull();
    expect(await db.rateLimit.findUnique({ where: { key: `spent-${tag}` } })).toBeNull();
    expect(await db.rateLimit.findUnique({ where: { key: `running-${tag}` } })).not.toBeNull();
    expect(await db.idempotencyKey.findUnique({ where: { userId_key: { userId: user.id, key: `old-${tag}` } } })).toBeNull();
    expect(await db.idempotencyKey.findUnique({ where: { userId_key: { userId: user.id, key: `recent-${tag}` } } })).not.toBeNull();
  });

  it("is safe to run twice in a row", async () => {
    await pruneExpired();

    await expect(pruneExpired()).resolves.toEqual({ sessions: expect.any(Number), rateLimits: expect.any(Number), idempotencyKeys: expect.any(Number) });
  });
});
