import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CLAIM_CREATE_LIMIT } from "@/lib/claims/limits";
import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createClaim, createItem, createSignedInUser, createUser } from "./support/factories";

interface ClaimBody {
  id: string;
  status: string;
  createdAt: string;
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

const proof = "Black strap, my initials AO are stitched inside the lining";

async function verifiedClaimant() {
  return createSignedInUser({ kycStatus: "VERIFIED" });
}

describe("POST /api/items/:id/claims", () => {
  it("creates a pending claim with its proof files in order", async () => {
    const poster = await createUser();
    const item = await createItem(poster.id);
    const { user, client } = await verifiedClaimant();
    const photo = buildObjectKey("claim", user.id, "image/jpeg");
    const clip = buildObjectKey("claim", user.id, "video/mp4");

    const result = await client.post<ClaimBody>(`/api/items/${item.id}/claims`, {
      description: `  ${proof}  `,
      mediaKeys: [photo, clip],
    });

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ status: "PENDING" });
    expect(new Date(result.body.createdAt).toString()).not.toBe("Invalid Date");
    const stored = await db.claim.findUniqueOrThrow({
      where: { id: result.body.id },
      include: { media: { orderBy: { position: "asc" } } },
    });
    expect(stored).toMatchObject({ itemId: item.id, claimantId: user.id, status: "PENDING", proofText: proof });
    expect(stored.media.map(({ key, type }) => ({ key, type }))).toEqual([
      { key: photo, type: "IMAGE" },
      { key: clip, type: "VIDEO" },
    ]);
  });

  it.each([
    ["a short description", { description: "mine" }],
    ["a missing description", {}],
    ["more than five files", { description: proof, mediaKeys: ["a", "b", "c", "d", "e", "f"] }],
    ["the same file twice", { description: proof, mediaKeys: ["a", "a"] }],
    ["a malformed key", { description: proof, mediaKeys: ["../../etc/passwd"] }],
  ])("rejects %s and creates nothing", async (_label, body) => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await verifiedClaimant();

    const result = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, body);

    expect(result.status).toBe(400);
    expect(await db.claim.count({ where: { claimantId: user.id } })).toBe(0);
  });

  it("rejects proof files that belong to someone else or to another purpose", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await verifiedClaimant();
    const other = await createUser();

    for (const key of [
      buildObjectKey("claim", other.id, "image/jpeg"),
      buildObjectKey("item", user.id, "image/jpeg"),
      buildObjectKey("kyc", user.id, "image/jpeg"),
    ]) {
      const result = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, { description: proof, mediaKeys: [key] });
      expect(result.status).toBe(400);
    }
    expect(await db.claim.count({ where: { claimantId: user.id } })).toBe(0);
  });

  it("refuses a claim on your own item", async () => {
    const { user, client } = await verifiedClaimant();
    const item = await createItem(user.id);

    const result = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, { description: proof });

    expect(result.status).toBe(403);
    expect(await db.claim.count({ where: { itemId: item.id } })).toBe(0);
  });

  it.each(["CLAIMED", "RESOLVED"] as const)("refuses a claim on an item that is %s", async (status) => {
    const item = await createItem((await createUser()).id, { status });
    const { client } = await verifiedClaimant();

    const result = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, { description: proof });

    expect(result.status).toBe(409);
    expect(await db.claim.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("answers 404 for a removed or unknown item", async () => {
    const removed = await createItem((await createUser()).id, { status: "REMOVED" });
    const { client } = await verifiedClaimant();

    expect((await client.post(`/api/items/${removed.id}/claims`, { description: proof })).status).toBe(404);
    expect((await client.post("/api/items/does-not-exist/claims", { description: proof })).status).toBe(404);
  });

  it("allows one pending claim per item and a new claim after a rejection", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await verifiedClaimant();
    const first = await client.post<ClaimBody>(`/api/items/${item.id}/claims`, { description: proof });

    const second = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, { description: proof });
    await db.claim.update({ where: { id: first.body.id }, data: { status: "REJECTED", decidedAt: new Date() } });
    const afterRejection = await client.post<ClaimBody>(`/api/items/${item.id}/claims`, { description: proof });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error).toContain("pending claim");
    expect(afterRejection.status).toBe(201);
    expect(await db.claim.count({ where: { claimantId: user.id, itemId: item.id } })).toBe(2);
  });

  it("lets only one of two racing duplicate claims through", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await verifiedClaimant();

    const results = await Promise.all([
      client.post(`/api/items/${item.id}/claims`, { description: proof }),
      client.post(`/api/items/${item.id}/claims`, { description: proof }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await db.claim.count({ where: { claimantId: user.id, itemId: item.id } })).toBe(1);
  });

  it("replays the original response for a retried request with the same Idempotency-Key", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await verifiedClaimant();
    const options = { headers: { "idempotency-key": `key-${randomUUID()}` } };

    const first = await client.post<ClaimBody>(`/api/items/${item.id}/claims`, { description: proof }, options);
    const retry = await client.post<ClaimBody>(`/api/items/${item.id}/claims`, { description: proof }, options);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.headers.get("idempotent-replayed")).toBe("true");
    expect(retry.body).toEqual(first.body);
    expect(await db.claim.count({ where: { claimantId: user.id, itemId: item.id } })).toBe(1);
  });

  it("refuses to reuse an Idempotency-Key for a different claim", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await verifiedClaimant();
    const options = { headers: { "idempotency-key": `key-${randomUUID()}` } };
    await client.post(`/api/items/${item.id}/claims`, { description: proof }, options);

    const reused = await client.post<ErrorBody>(
      `/api/items/${item.id}/claims`,
      { description: "A completely different description of the item" },
      options,
    );

    expect(reused.status).toBe(422);
  });

  it("limits how many claims one user can submit in a day, counting concurrent requests exactly", async () => {
    const poster = await createUser();
    const { client } = await verifiedClaimant();
    const { max } = CLAIM_CREATE_LIMIT;
    const items = await Promise.all(Array.from({ length: max + 1 }, () => createItem(poster.id)));

    const allowed = await Promise.all(
      items.slice(0, max).map((item) => client.post(`/api/items/${item.id}/claims`, { description: proof })),
    );
    expect(allowed.map((result) => result.status)).toEqual(Array(max).fill(201));

    const blocked = await client.post<ErrorBody>(`/api/items/${items[max].id}/claims`, { description: proof });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("rejects signed-out requests and foreign origins", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await verifiedClaimant();

    expect((await new ApiClient().post(`/api/items/${item.id}/claims`, { description: proof })).status).toBe(401);
    expect(
      (await client.post(`/api/items/${item.id}/claims`, { description: proof }, { origin: "https://evil.example" }))
        .status,
    ).toBe(403);
    expect(await db.claim.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("still lets the same person claim different items", async () => {
    const poster = await createUser();
    const { client } = await verifiedClaimant();
    const [first, second] = await Promise.all([createItem(poster.id), createItem(poster.id)]);
    await createClaim(first.id, (await createUser()).id);

    expect((await client.post(`/api/items/${first.id}/claims`, { description: proof })).status).toBe(201);
    expect((await client.post(`/api/items/${second.id}/claims`, { description: proof })).status).toBe(201);
  });
});
