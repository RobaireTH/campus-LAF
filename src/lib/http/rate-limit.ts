import { db } from "@/lib/db";

import { tooManyRequests } from "./errors";

export interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

export async function consumeRateLimit(key: string, { max, windowSeconds }: RateLimitRule) {
  const rows = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, (now() AT TIME ZONE 'utc') + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'utc') THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'utc') THEN (now() AT TIME ZONE 'utc') + make_interval(secs => ${windowSeconds})
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - (now() AT TIME ZONE 'utc')))))::int AS "retryAfter"
  `;
  const { count, retryAfter } = rows[0];
  if (count > max) throw tooManyRequests(retryAfter);
}
