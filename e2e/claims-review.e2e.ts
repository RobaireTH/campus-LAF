import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createClaim, createItem, createSignedInUser, createUser } from "./support/factories";

interface ClaimView {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  claimant: { name: string; verified: boolean };
  media: { id: string; url: string; type: string }[];
}

interface ErrorBody {
  error: string;
}

const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe("GET /api/items/:id/claims", () => {
  it("shows the owner every claim with its proof, pending claims first", async () => {
    const { user: poster, client } = await createSignedInUser();
    const item = await createItem(poster.id);
    const verified = await createUser({ name: "Ada Verified", kycStatus: "VERIFIED" });
    const unnamed = await createUser({ name: null, kycStatus: "PENDING" });
    const rejectedUser = await createUser({ name: "Rita Rejected", kycStatus: "VERIFIED" });
    const olderPending = await createClaim(item.id, verified.id, {
      proofText: "Verified claimant's proof",
      createdAt: secondsAgo(120),
    });
    const newerPending = await createClaim(item.id, unnamed.id, {
      proofText: "Unnamed claimant's proof",
      createdAt: secondsAgo(60),
    });
    const decided = await createClaim(item.id, rejectedUser.id, { status: "REJECTED", proofText: "Rejected proof" });
    const photo = buildObjectKey("claim", verified.id, "image/jpeg");
    const clip = buildObjectKey("claim", verified.id, "video/mp4");
    await db.claimMedia.createMany({
      data: [
        { claimId: olderPending.id, key: clip, type: "VIDEO", position: 1 },
        { claimId: olderPending.id, key: photo, type: "IMAGE", position: 0 },
      ],
    });

    const result = await client.get<{ claims: ClaimView[] }>(`/api/items/${item.id}/claims`);

    expect(result.status).toBe(200);
    expect(result.body.claims.map((claim) => claim.id)).toEqual([newerPending.id, olderPending.id, decided.id]);
    const [unnamedView, verifiedView, rejectedView] = result.body.claims;
    expect(unnamedView).toMatchObject({
      status: "PENDING",
      description: "Unnamed claimant's proof",
      claimant: { name: "Anonymous", verified: false },
      media: [],
    });
    expect(verifiedView).toMatchObject({ description: "Verified claimant's proof", claimant: { name: "Ada Verified", verified: true } });
    expect(rejectedView).toMatchObject({ status: "REJECTED", claimant: { name: "Rita Rejected", verified: true } });
    expect(Object.keys(verifiedView).sort()).toEqual(["claimant", "createdAt", "description", "id", "media", "status"]);
    expect(verifiedView.media.map((file) => file.type)).toEqual(["IMAGE", "VIDEO"]);
    expect(verifiedView.media[0].url).toContain(photo);
    expect(verifiedView.media[0].url).toContain("X-Amz-Expires=300");
  });

  it("never shows a claimant's contact details", async () => {
    const { user: poster, client } = await createSignedInUser();
    const item = await createItem(poster.id);
    const claimant = await createUser({ kycStatus: "VERIFIED" });
    await createClaim(item.id, claimant.id);

    const result = await client.get<{ claims: ClaimView[] }>(`/api/items/${item.id}/claims`);

    const text = JSON.stringify(result.body);
    for (const secret of [claimant.email, claimant.phone, claimant.id]) {
      if (secret) expect(text).not.toContain(secret);
    }
  });

  it("is empty for an item nobody has claimed", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id);

    expect((await client.get<{ claims: ClaimView[] }>(`/api/items/${item.id}/claims`)).body.claims).toEqual([]);
  });

  it("still works for the owner of a removed item", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id, { status: "REMOVED" });
    await createClaim(item.id, (await createUser()).id, { status: "CANCELLED" });

    const result = await client.get<{ claims: ClaimView[] }>(`/api/items/${item.id}/claims`);

    expect(result.status).toBe(200);
    expect(result.body.claims).toHaveLength(1);
  });

  it("is private to the owner", async () => {
    const poster = await createUser();
    const item = await createItem(poster.id);
    const { user: claimant, client: claimantClient } = await createSignedInUser({ kycStatus: "VERIFIED" });
    await createClaim(item.id, claimant.id);
    const { client: stranger } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: admin } = await createSignedInUser({ role: "ADMIN", kycStatus: "VERIFIED" });

    for (const client of [claimantClient, stranger, admin]) {
      const result = await client.get<ErrorBody>(`/api/items/${item.id}/claims`);
      expect(result.status).toBe(403);
      expect(result.body.error).toBe("Only the poster can review claims.");
    }
    expect((await new ApiClient().get(`/api/items/${item.id}/claims`)).status).toBe(401);
  });

  it("answers 404 for an unknown item", async () => {
    const { client } = await createSignedInUser();

    expect((await client.get("/api/items/does-not-exist/claims")).status).toBe(404);
  });
});

describe("GET /api/me/claims", () => {
  it("lists the user's own claims newest first with the item they are about", async () => {
    const poster = await createUser();
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const older = await createItem(poster.id, { title: "Older item", type: "FOUND" });
    const newer = await createItem(poster.id, { title: "Newer item", type: "LOST" });
    const olderClaim = await createClaim(older.id, user.id, { status: "REJECTED", createdAt: secondsAgo(120) });
    const newerClaim = await createClaim(newer.id, user.id, { createdAt: secondsAgo(60) });
    await createClaim(newer.id, (await createUser()).id);

    const result = await client.get<{ claims: { id: string; status: string; createdAt: string; item: object }[] }>(
      "/api/me/claims",
    );

    expect(result.status).toBe(200);
    expect(result.body.claims.map((claim) => claim.id)).toEqual([newerClaim.id, olderClaim.id]);
    expect(result.body.claims[0]).toMatchObject({
      status: "PENDING",
      item: { id: newer.id, title: "Newer item", type: "LOST" },
    });
    expect(Object.keys(result.body.claims[0]).sort()).toEqual(["createdAt", "id", "item", "status"]);
    expect(JSON.stringify(result.body)).not.toContain(poster.id);
  });

  it("includes cancelled claims and is empty for a user with none", async () => {
    const poster = await createUser();
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: newcomer } = await createSignedInUser();
    const item = await createItem(poster.id);
    await createClaim(item.id, user.id, { status: "CANCELLED", decidedAt: new Date() });

    expect((await client.get<{ claims: { status: string }[] }>("/api/me/claims")).body.claims[0].status).toBe("CANCELLED");
    expect((await newcomer.get<{ claims: unknown[] }>("/api/me/claims")).body.claims).toEqual([]);
  });

  it("requires a session", async () => {
    expect((await new ApiClient().get("/api/me/claims")).status).toBe(401);
  });
});
