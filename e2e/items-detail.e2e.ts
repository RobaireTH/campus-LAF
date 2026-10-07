import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createClaim, createItem, createSignedInUser, createUser } from "./support/factories";

interface Detail {
  id: string;
  title: string;
  type: string;
  category: string;
  location: string;
  date: string;
  status: string;
  description: string;
  locationNote: string | null;
  media: { id: string; url: string; kind: string }[];
  postedAt: string;
  poster: { displayName: string };
  isOwner: boolean;
  myClaim: { id: string; status: string } | null;
  claimCount: number;
}

interface DetailBody {
  item: Detail;
}

interface ErrorBody {
  error: string;
}

describe("GET /api/items/:id", () => {
  it("shows the public view with signed media and only the poster's display name", async () => {
    const poster = await createUser({ name: "Ada Okafor" });
    const item = await createItem(poster.id, { title: "Black strap", locationNote: "Second floor, near the printers" });
    const photo = buildObjectKey("item", poster.id, "image/jpeg");
    const clip = buildObjectKey("item", poster.id, "video/mp4");
    await db.itemMedia.createMany({
      data: [
        { itemId: item.id, key: clip, type: "VIDEO", position: 1 },
        { itemId: item.id, key: photo, type: "IMAGE", position: 0 },
      ],
    });

    const result = await new ApiClient().get<DetailBody>(`/api/items/${item.id}`);

    expect(result.status).toBe(200);
    expect(result.body.item).toMatchObject({
      id: item.id,
      title: "Black strap",
      type: "LOST",
      status: "OPEN",
      locationNote: "Second floor, near the printers",
      poster: { displayName: "Ada Okafor" },
      isOwner: false,
      myClaim: null,
      claimCount: 0,
    });
    expect(result.body.item.media.map((file) => file.kind)).toEqual(["IMAGE", "VIDEO"]);
    expect(result.body.item.media[0].url).toContain(photo);
    expect(result.body.item.media[0].url).toContain("X-Amz-Signature=");
    expect(Object.keys(result.body.item.media[0]).sort()).toEqual(["id", "kind", "url"]);
    expect(new Date(result.body.item.postedAt).toString()).not.toBe("Invalid Date");

    const { media, ...withoutMedia } = result.body.item;
    expect(media).toHaveLength(2);
    const text = JSON.stringify(withoutMedia);
    for (const secret of [poster.email, poster.phone, poster.id, "password", "kycIdImageKey", "posterId"]) {
      if (secret) expect(text).not.toContain(secret);
    }
  });

  it("calls a poster without a name Anonymous", async () => {
    const poster = await createUser({ name: null });
    const item = await createItem(poster.id);

    const result = await new ApiClient().get<DetailBody>(`/api/items/${item.id}`);

    expect(result.body.item.poster).toEqual({ displayName: "Anonymous" });
  });

  it("tells the owner they own it and counts every claim", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id);
    await createClaim(item.id, (await createUser()).id, { status: "REJECTED" });
    await createClaim(item.id, (await createUser()).id, { status: "CANCELLED" });
    await createClaim(item.id, (await createUser()).id, { status: "PENDING" });

    const result = await client.get<DetailBody>(`/api/items/${item.id}`);

    expect(result.body.item).toMatchObject({ isOwner: true, myClaim: null, claimCount: 3 });
  });

  it("shows a claimant their own latest claim and nobody else's", async () => {
    const poster = await createUser();
    const item = await createItem(poster.id);
    const { user: claimant, client } = await createSignedInUser();
    await createClaim(item.id, claimant.id, { status: "REJECTED", createdAt: new Date(Date.now() - 60_000) });
    const latest = await createClaim(item.id, claimant.id, { status: "PENDING" });
    await createClaim(item.id, (await createUser()).id, { status: "PENDING" });

    const result = await client.get<DetailBody>(`/api/items/${item.id}`);

    expect(result.body.item).toMatchObject({
      isOwner: false,
      myClaim: { id: latest.id, status: "PENDING" },
      claimCount: 0,
    });
  });

  it("hides a removed item from the public and other users, but not from its owner or an admin", async () => {
    const { user: owner, client: ownerClient } = await createSignedInUser();
    const { client: stranger } = await createSignedInUser();
    const { client: admin } = await createSignedInUser({ role: "ADMIN" });
    const item = await createItem(owner.id, { status: "REMOVED" });

    expect((await new ApiClient().get<ErrorBody>(`/api/items/${item.id}`)).status).toBe(404);
    expect((await stranger.get<ErrorBody>(`/api/items/${item.id}`)).status).toBe(404);

    const asOwner = await ownerClient.get<DetailBody>(`/api/items/${item.id}`);
    expect(asOwner.status).toBe(200);
    expect(asOwner.body.item.status).toBe("REMOVED");
    expect((await admin.get<DetailBody>(`/api/items/${item.id}`)).status).toBe(200);
  });

  it.each([
    ["an id that does not exist", "does-not-exist"],
    ["a very long id", "x".repeat(500)],
    ["an id with spaces and symbols", encodeURIComponent("../../etc/passwd or 1=1")],
  ])("answers %s with 404, never 500", async (_label, id) => {
    const result = await new ApiClient().get<ErrorBody>(`/api/items/${id}`);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe("Item not found");
  });
});
