import { beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import { createSignedInUser, createUser } from "./support/factories";

interface ErrorBody {
  error: string;
}

interface ItemBody {
  item: { id: string; isOwner: boolean };
}

interface ItemListBody {
  items: { id: string }[];
}

let categoryId: string;
let locationId: string;

beforeAll(async () => {
  categoryId = (await db.category.findFirstOrThrow()).id;
  locationId = (await db.location.findFirstOrThrow()).id;
});

const newItem = () => ({
  type: "LOST",
  title: "Blue umbrella",
  description: "Left on the library steps.",
  categoryId,
  locationId,
  dateLostOrFound: new Date().toISOString(),
});

function createItem(posterId: string) {
  return db.item.create({
    data: {
      type: "LOST",
      title: "Seeded umbrella",
      description: "Created directly in the database.",
      eventDate: new Date(),
      categoryId,
      locationId,
      posterId,
    },
  });
}

describe("identity comes only from the session cookie", () => {
  it("ignores a spoofed x-user-id header on every route", async () => {
    const owner = await createUser();
    const item = await createItem(owner.id);
    const spoofed = { "x-user-id": owner.id };

    const mine = await new ApiClient().get<ErrorBody>("/api/me/items", { headers: spoofed });
    const create = await new ApiClient().post<ErrorBody>("/api/items", newItem(), { headers: spoofed });
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
    expect((await client.post("/api/items", newItem())).status).toBe(401);
    expect((await client.post("/api/uploads", { purpose: "item", contentType: "image/jpeg", size: 1000 })).status).toBe(
      401,
    );
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

    const result = await client.post<ItemBody>("/api/items", newItem());

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

  it("issue upload URLs scoped to the signed-in user", async () => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<{ uploadUrl: string; key: string; expiresIn: number }>("/api/uploads", {
      purpose: "item",
      contentType: "image/jpeg",
      size: 1000,
    });

    expect(result.status).toBe(201);
    expect(result.body.key).toMatch(new RegExp(`^item/${user.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(result.body.uploadUrl).toContain("X-Amz-Signature=");
  });

  it("reject an invalid upload request with a readable message", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/uploads", {
      purpose: "item",
      contentType: "image/jpeg",
      size: 50 * 1024 * 1024,
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toContain("too large");
  });

  it("accept a claim from a signed-in user", async () => {
    const poster = await createUser();
    const item = await createItem(poster.id);
    const { client } = await createSignedInUser();

    const result = await client.post<{ id: string; status: string }>(`/api/items/${item.id}/claims`, {
      description: "Black strap, my initials AO on the zip",
    });

    expect(result.status).toBe(201);
    expect(result.body.status).toBe("PENDING");
    expect(await db.claim.count({ where: { itemId: item.id } })).toBe(1);
  });
});
