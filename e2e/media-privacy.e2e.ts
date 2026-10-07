import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createItem, createSignedInUser, createUser, newItemPayload } from "./support/factories";

interface ItemBody {
  item: { id: string };
}

describe("media keys attached to an item", () => {
  it.each([
    ["a photo uploaded by someone else", async () => buildObjectKey("item", (await createUser()).id, "image/jpeg")],
    ["an ID photo", async (userId: string) => buildObjectKey("kyc", userId, "image/jpeg")],
    ["a claim upload", async (userId: string) => buildObjectKey("claim", userId, "image/jpeg")],
    ["a malformed key", async () => "../../etc/passwd"],
  ])("refuse %s", async (_label, makeKey) => {
    const { user, client } = await createSignedInUser();

    const result = await client.post("/api/items", await newItemPayload({ mediaKeys: [await makeKey(user.id)] }));

    expect(result.status).toBe(400);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(0);
  });

  it("are stored in order with the right media type when the user owns them", async () => {
    const { user, client } = await createSignedInUser();
    const photo = buildObjectKey("item", user.id, "image/jpeg");
    const clip = buildObjectKey("item", user.id, "video/mp4");

    const result = await client.post<ItemBody>("/api/items", await newItemPayload({ mediaKeys: [photo, clip] }));

    expect(result.status).toBe(201);
    const media = await db.itemMedia.findMany({ where: { itemId: result.body.item.id }, orderBy: { position: "asc" } });
    expect(media.map(({ key, type, position }) => ({ key, type, position }))).toEqual([
      { key: photo, type: "IMAGE", position: 0 },
      { key: clip, type: "VIDEO", position: 1 },
    ]);
  });
});

describe("ID photos stay private", () => {
  it("never appear in a public, item or account response", async () => {
    const { user, client } = await createSignedInUser();
    const key = buildObjectKey("kyc", user.id, "image/png");
    expect((await client.post("/api/me/verification", { key })).status).toBe(200);
    const item = await createItem(user.id);

    const responses = [
      await new ApiClient().get("/api/items?limit=50"),
      await new ApiClient().get(`/api/items/${item.id}`),
      await client.get(`/api/items/${item.id}`),
      await client.get("/api/me"),
      await client.get("/api/me/items"),
    ];

    for (const response of responses) {
      expect(response.status).toBe(200);
      const text = JSON.stringify(response.body);
      expect(text).not.toContain(key);
      expect(text).not.toContain("kyc/");
      expect(text).not.toContain("kycIdImageKey");
    }
  });
});
