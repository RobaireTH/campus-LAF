import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createItem, createSignedInUser, createUser, newItemPayload } from "./support/factories";

interface VerificationBody {
  verification: { status: string; submittedAt: string };
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

interface MeBody {
  user: { kycStatus: string; kycSubmittedAt: string | null; kycRejectionReason: string | null };
}

const idPhotoKey = (userId: string) => buildObjectKey("kyc", userId, "image/jpeg");

describe("POST /api/me/verification", () => {
  it("moves the user to pending and records the photo and time", async () => {
    const { user, client } = await createSignedInUser();
    const key = idPhotoKey(user.id);

    const result = await client.post<VerificationBody>("/api/me/verification", { key });

    expect(result.status).toBe(200);
    expect(result.body.verification.status).toBe("PENDING");
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ kycStatus: "PENDING", kycIdImageKey: key, kycRejectionReason: null });
    expect(stored.kycSubmittedAt?.toISOString()).toBe(result.body.verification.submittedAt);

    const me = await client.get<MeBody>("/api/me");
    expect(me.body.user).toMatchObject({
      kycStatus: "PENDING",
      kycSubmittedAt: result.body.verification.submittedAt,
      kycRejectionReason: null,
    });
  });

  it("rejects signed-out requests", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/me/verification", { key: "kyc/x/y.jpg" });

    expect(result.status).toBe(401);
  });

  it("rejects a missing key", async () => {
    const { client } = await createSignedInUser();

    expect((await client.post<ErrorBody>("/api/me/verification", {})).status).toBe(400);
    expect((await client.post<ErrorBody>("/api/me/verification")).status).toBe(400);
  });

  it.each([
    ["a photo uploaded by someone else", async () => idPhotoKey((await createUser()).id)],
    ["an upload meant for claims", async (userId: string) => buildObjectKey("claim", userId, "image/jpeg")],
    ["an upload meant for items", async (userId: string) => buildObjectKey("item", userId, "image/jpeg")],
    ["a video", async (userId: string) => `kyc/${userId}/${randomUUID()}.mp4`],
    ["a path traversal", async () => "../../kyc/someone/photo.jpg"],
    ["an empty key", async () => ""],
  ])("rejects %s and leaves the account untouched", async (_label, makeKey) => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/me/verification", { key: await makeKey(user.id) });

    expect(result.status).toBe(400);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ kycStatus: "NOT_SUBMITTED", kycIdImageKey: null, kycSubmittedAt: null });
  });

  it("answers an identical repeat with the same result and changes nothing", async () => {
    const { user, client } = await createSignedInUser();
    const key = idPhotoKey(user.id);
    const first = await client.post<VerificationBody>("/api/me/verification", { key });

    const repeat = await client.post<VerificationBody>("/api/me/verification", { key });

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.kycSubmittedAt?.toISOString()).toBe(first.body.verification.submittedAt);
  });

  it("treats two identical requests racing each other as one submission", async () => {
    const { user, client } = await createSignedInUser();
    const key = idPhotoKey(user.id);

    const [first, second] = await Promise.all([
      client.post<VerificationBody>("/api/me/verification", { key }),
      client.post<VerificationBody>("/api/me/verification", { key }),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);
    expect(first.body).toEqual(second.body);
  });

  it("lets exactly one of two different photos win a race", async () => {
    const { user, client } = await createSignedInUser();
    const keys = [idPhotoKey(user.id), idPhotoKey(user.id)];

    const results = await Promise.all(keys.map((key) => client.post<VerificationBody>("/api/me/verification", { key })));

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const winner = keys[results.findIndex((result) => result.status === 200)];
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycIdImageKey).toBe(winner);
  });

  it("refuses a different photo while one is under review", async () => {
    const { user, client } = await createSignedInUser();
    const first = idPhotoKey(user.id);
    await client.post("/api/me/verification", { key: first });

    const result = await client.post<ErrorBody>("/api/me/verification", { key: idPhotoKey(user.id) });

    expect(result.status).toBe(409);
    expect(result.body.error).toBe("Your ID is already under review.");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycIdImageKey).toBe(first);
  });

  it("refuses a user who is already verified", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await client.post<ErrorBody>("/api/me/verification", { key: idPhotoKey(user.id) });

    expect(result.status).toBe(409);
    expect(result.body.error).toBe("Your ID is already verified.");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("VERIFIED");
  });

  it("accepts a new photo after a rejection and clears the reason", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "REJECTED" });
    await db.user.update({
      where: { id: user.id },
      data: { kycIdImageKey: idPhotoKey(user.id), kycRejectionReason: "The photo is too blurry to read." },
    });
    const before = await client.get<MeBody>("/api/me");
    expect(before.body.user).toMatchObject({
      kycStatus: "REJECTED",
      kycRejectionReason: "The photo is too blurry to read.",
    });
    const key = idPhotoKey(user.id);

    const result = await client.post<VerificationBody>("/api/me/verification", { key });

    expect(result.status).toBe(200);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ kycStatus: "PENDING", kycIdImageKey: key, kycRejectionReason: null });
  });

  it("blocks a foreign Origin", async () => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<ErrorBody>(
      "/api/me/verification",
      { key: idPhotoKey(user.id) },
      { origin: "https://evil.example" },
    );

    expect(result.status).toBe(403);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("NOT_SUBMITTED");
  });
});

describe("claims need an approved ID", () => {
  const description = "Black strap, my initials AO on the zip";

  it.each(["NOT_SUBMITTED", "PENDING", "REJECTED"] as const)(
    "are refused for a user whose ID status is %s",
    async (kycStatus) => {
      const poster = await createUser();
      const item = await createItem(poster.id);
      const { client } = await createSignedInUser({ kycStatus });

      const result = await client.post<ErrorBody>(`/api/items/${item.id}/claims`, { description });

      expect(result.status).toBe(403);
      expect(result.body.error).toBe("Verify your student ID to do this.");
      expect(await db.claim.count({ where: { itemId: item.id } })).toBe(0);
    },
  );

  it("are accepted from a verified user", async () => {
    const poster = await createUser();
    const item = await createItem(poster.id);
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await client.post<{ id: string; status: string }>(`/api/items/${item.id}/claims`, { description });

    expect(result.status).toBe(201);
    expect(result.body.status).toBe("PENDING");
    expect(await db.claim.count({ where: { itemId: item.id } })).toBe(1);
  });

  it("do not need an approved ID to post an item", async () => {
    const { client } = await createSignedInUser({ kycStatus: "NOT_SUBMITTED" });

    const result = await client.post("/api/items", await newItemPayload({ type: "LOST", title: "Blue umbrella" }));

    expect(result.status).toBe(201);
  });
});
