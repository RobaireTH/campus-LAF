import { after } from "next/server";

import { db } from "@/lib/db";
import { RETENTION_MS as IDEMPOTENCY_RETENTION_MS } from "@/lib/http/idempotency";
import { logError } from "@/lib/http/log";

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let lastPrune = 0;

export async function pruneExpired(now = new Date()) {
  const [sessions, rateLimits, idempotencyKeys] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
    db.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - IDEMPOTENCY_RETENTION_MS) } } }),
  ]);
  return { sessions: sessions.count, rateLimits: rateLimits.count, idempotencyKeys: idempotencyKeys.count };
}

export function schedulePrune() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  after(() => pruneExpired().catch((error) => logError("Housekeeping failed", error)));
}
