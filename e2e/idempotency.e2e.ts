import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createSignedInUser, newItemPayload } from "./support/factories";

interface ErrorBody {
  error: string;
}

interface DetailBody {
  item: { id: string; title: string };
}

const newKey = () => `key-${randomUUID()}`;
const withKey = (key: string) => ({ headers: { "idempotency-key": key } });
const HOUR = 60 * 60 * 1000;

describe("Idempotency-Key on POST /api/items", () => {
  it("replays the original response for a retry and creates one item", async () => {
    const { user, client } = await createSignedInUser();
    const payload = await newItemPayload();
    const key = newKey();

    const first = await client.post<DetailBody>("/api/items", payload, withKey(key));
    const retry = await client.post<DetailBody>("/api/items", payload, withKey(key));

    expect(first.status).toBe(201);
    expect(first.headers.get("idempotent-replayed")).toBeNull();
    expect(retry.status).toBe(201);
    expect(retry.headers.get("idempotent-replayed")).toBe("true");
    expect(retry.body).toEqual(first.body);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(1);
  });

  it("creates exactly one item when identical requests race", async () => {
    const { user, client } = await createSignedInUser();
    const payload = await newItemPayload();
    const key = newKey();

    const results = await Promise.all(
      Array.from({ length: 4 }, () => client.post<DetailBody>("/api/items", payload, withKey(key))),
    );

    expect(results.every((result) => result.status === 201 || result.status === 409)).toBe(true);
    const originals = results.filter((result) => result.status === 201 && !result.headers.get("idempotent-replayed"));
    expect(originals).toHaveLength(1);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(1);

    const later = await client.post<DetailBody>("/api/items", payload, withKey(key));
    expect(later.status).toBe(201);
    expect(later.headers.get("idempotent-replayed")).toBe("true");
    expect(later.body).toEqual(originals[0].body);
  });

  it("refuses to reuse a key for a different request", async () => {
    const { user, client } = await createSignedInUser();
    const key = newKey();
    await client.post("/api/items", await newItemPayload({ title: "First request" }), withKey(key));

    const reused = await client.post<ErrorBody>("/api/items", await newItemPayload({ title: "Another request" }), withKey(key));

    expect(reused.status).toBe(422);
    expect(reused.body.error).toContain("different request");
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(1);
  });

  it("lets a corrected retry reuse the key after a rejected request", async () => {
    const { user, client } = await createSignedInUser();
    const key = newKey();

    const rejected = await client.post("/api/items", await newItemPayload({ title: "ab" }), withKey(key));
    const corrected = await client.post<DetailBody>("/api/items", await newItemPayload(), withKey(key));

    expect(rejected.status).toBe(400);
    expect(corrected.status).toBe(201);
    expect(corrected.headers.get("idempotent-replayed")).toBeNull();
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(1);
  });

  it("keeps keys separate for each user", async () => {
    const [first, second] = await Promise.all([createSignedInUser(), createSignedInUser()]);
    const payload = await newItemPayload();
    const key = newKey();

    const a = await first.client.post<DetailBody>("/api/items", payload, withKey(key));
    const b = await second.client.post<DetailBody>("/api/items", payload, withKey(key));

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.item.id).not.toBe(b.body.item.id);
  });

  it.each(["short", "has spaces in it!", "x".repeat(129)])("rejects the malformed key %j", async (key) => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/items", await newItemPayload(), withKey(key));

    expect(result.status).toBe(400);
    expect(result.body.error).toContain("Idempotency-Key");
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(0);
  });

  it("is optional: without a key two identical requests create two items", async () => {
    const { user, client } = await createSignedInUser();
    const payload = await newItemPayload();

    await client.post("/api/items", payload);
    await client.post("/api/items", payload);

    expect(await db.item.count({ where: { posterId: user.id } })).toBe(2);
  });

  it("forgets a key after a day", async () => {
    const { user, client } = await createSignedInUser();
    const payload = await newItemPayload();
    const key = newKey();
    await client.post("/api/items", payload, withKey(key));
    await db.idempotencyKey.updateMany({ where: { userId: user.id, key }, data: { createdAt: new Date(Date.now() - 25 * HOUR) } });

    const again = await client.post("/api/items", payload, withKey(key));

    expect(again.status).toBe(201);
    expect(again.headers.get("idempotent-replayed")).toBeNull();
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(2);
  });

  it("takes over a request that was abandoned mid-flight", async () => {
    const { user, client } = await createSignedInUser();
    const key = newKey();
    await db.idempotencyKey.create({
      data: { userId: user.id, key, requestHash: "abandoned", createdAt: new Date(Date.now() - 2 * 60 * 1000) },
    });

    const result = await client.post<DetailBody>("/api/items", await newItemPayload(), withKey(key));

    expect(result.status).toBe(201);
    expect(result.headers.get("idempotent-replayed")).toBeNull();
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(1);
  });
});
