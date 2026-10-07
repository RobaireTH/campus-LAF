import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";

import { ApiError, badRequest, conflict } from "./errors";

const RETENTION_MS = 24 * 60 * 60 * 1000;
const IN_PROGRESS_TIMEOUT_MS = 60 * 1000;
const MAX_ATTEMPTS = 3;

const keySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,128}$/, "Idempotency-Key must be 8 to 128 letters, digits, dashes or underscores.");

async function fingerprint(request: Request) {
  return sha256(`${request.method} ${new URL(request.url).pathname}\n${await request.clone().text()}`);
}

async function claim(userId: string, key: string, requestHash: string) {
  const now = Date.now();
  await db.idempotencyKey.deleteMany({
    where: {
      userId,
      key,
      OR: [
        { createdAt: { lt: new Date(now - RETENTION_MS) } },
        { statusCode: null, createdAt: { lt: new Date(now - IN_PROGRESS_TIMEOUT_MS) } },
      ],
    },
  });
  const created = await db.idempotencyKey.createMany({ data: [{ userId, key, requestHash }], skipDuplicates: true });
  return created.count === 1;
}

function replay(
  record: { requestHash: string; statusCode: number | null; response: Prisma.JsonValue | null },
  requestHash: string,
) {
  if (record.requestHash !== requestHash) {
    throw new ApiError(422, "This Idempotency-Key was already used for a different request.");
  }
  if (record.statusCode === null) throw conflict("This request is still being processed. Try again in a moment.");
  return Response.json(record.response, { status: record.statusCode, headers: { "Idempotent-Replayed": "true" } });
}

export async function withIdempotency(request: Request, userId: string, run: () => Promise<Response>) {
  const header = request.headers.get("idempotency-key");
  if (header === null) return run();

  const parsed = keySchema.safeParse(header);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const key = parsed.data;
  const requestHash = await fingerprint(request);
  const id = { userId_key: { userId, key } };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (await claim(userId, key, requestHash)) {
      const release = () => db.idempotencyKey.deleteMany({ where: { userId, key } });
      try {
        const response = await run();
        if (!response.ok) {
          await release();
          return response;
        }
        await db.idempotencyKey.update({
          where: id,
          data: { statusCode: response.status, response: await response.clone().json() },
        });
        return response;
      } catch (error) {
        await release();
        throw error;
      }
    }
    const record = await db.idempotencyKey.findUnique({ where: id });
    if (record) return replay(record, requestHash);
  }
  throw conflict("This request is still being processed. Try again in a moment.");
}
