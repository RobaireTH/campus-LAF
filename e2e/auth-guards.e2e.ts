import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import { createItem, createSignedInUser, createUser, newItemPayload } from "./support/factories";

interface ErrorBody {
  error: string;
}

interface ItemBody {
  item: { id: string; isOwner: boolean };
}

interface ItemListBody {
  items: { id: string }[];
}

describe("identity comes only from the session cookie", () => {
  it("ignores a spoofed x-user-id header on every route", async () => {
    const owner = await createUser();
    const item = await createItem(owner.id);
    const spoofed = { "x-user-id": owner.id };

    const mine = await new ApiClient().get<ErrorBody>("/api/me/items", { headers: spoofed });
    const create = await new ApiClient().post<ErrorBody>("/api/items", await newItemPayload(), { headers: spoofed });
    const detail = await new ApiClient().get<ItemBody>(`/api/items/${item.id}`, { headers: spoofed });

    expect(mine.status).toBe(401);
    expect(create.status).toBe(401);
    expect(detail.status).toBe(200);
    expect(detail.body.item.isOwner).toBe(false);
  });
});

describe("routes that need a session", () => {
  it("reject anonymous requests", async () => {
    const client = new ApiClient();

    expect((await client.get("/api/me/items")).status).toBe(401);
    expect((await client.post("/api/items", await newItemPayload())).status).toBe(401);
    expect((await client.post("/api/uploads", { purpose: "item", contentType: "image/jpeg", size: 1000 })).status).toBe(
      401,
    );
    expect((await client.post("/api/me/verification", { key: "kyc/x/y.jpg" })).status).toBe(401);
    expect(
      (await client.post("/api/items/any-id/claims", { description: "My laptop has a cracked corner" })).status,
    ).toBe(401);
  });

  it("serve the signed-in user their own items only", async () => {
    const { user, client } = await createSignedInUser();
    const other = await createUser();
    const mine = await createItem(user.id);
    await createItem(other.id);

    const result = await client.get<ItemListBody>("/api/me/items");

    expect(result.status).toBe(200);
    expect(result.body.items.map((item) => item.id)).toEqual([mine.id]);
  });

  it("let a signed-in user publish an item as themselves", async () => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<ItemBody>("/api/items", await newItemPayload());

    expect(result.status).toBe(201);
    const stored = await db.item.findUniqueOrThrow({ where: { id: result.body.item.id } });
    expect(stored.posterId).toBe(user.id);
  });

  it("mark the poster as owner on the item detail", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id);

    const result = await client.get<ItemBody>(`/api/items/${item.id}`);

    expect(result.body.item.isOwner).toBe(true);
  });
});
