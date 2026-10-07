import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ITEM_CREATE_LIMIT } from "@/lib/items/limits";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import {
  createClaim,
  createItem,
  createScope,
  createSignedInUser,
  createUser,
  newItemPayload,
} from "./support/factories";

interface Detail {
  id: string;
  title: string;
  description: string;
  status: string;
  locationNote: string | null;
  date: string;
  category: string;
  location: string;
  isOwner: boolean;
  media: { id: string; url: string; kind: string }[];
  poster: { displayName: string };
  claimCount: number;
  myClaim: unknown;
}

interface DetailBody {
  item: Detail;
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

const DAY = 24 * 60 * 60 * 1000;

describe("POST /api/items", () => {
  it("publishes an item as the signed-in user and returns the full detail", async () => {
    const { user, client } = await createSignedInUser({ name: "Ada Okafor" });
    const photo = buildObjectKey("item", user.id, "image/jpeg");
    const payload = await newItemPayload({
      title: "  Grey flask  ",
      locationNote: "  Near the steps ",
      dateLostOrFound: "2026-10-01",
      mediaKeys: [photo],
    });

    const result = await client.post<DetailBody>("/api/items", payload);

    expect(result.status).toBe(201);
    expect(result.body.item).toMatchObject({
      title: "Grey flask",
      status: "OPEN",
      locationNote: "Near the steps",
      date: "2026-10-01T00:00:00.000Z",
      isOwner: true,
      poster: { displayName: "Ada Okafor" },
      claimCount: 0,
      myClaim: null,
    });
    expect(result.body.item.media).toHaveLength(1);
    expect(result.body.item.media[0].url).toContain(photo);
    const stored = await db.item.findUniqueOrThrow({ where: { id: result.body.item.id } });
    expect(stored).toMatchObject({ posterId: user.id, status: "OPEN", type: "FOUND" });
  });

  it("stores a blank note as no note", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<DetailBody>("/api/items", await newItemPayload({ locationNote: "   " }));

    expect(result.status).toBe(201);
    expect(result.body.item.locationNote).toBeNull();
  });

  it("accepts today's date even when it is a few hours ahead of the server clock", async () => {
    const { client } = await createSignedInUser();
    const sixHoursAhead = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const result = await client.post("/api/items", await newItemPayload({ dateLostOrFound: sixHoursAhead }));

    expect(result.status).toBe(201);
  });

  it.each([
    ["a short title", { title: "ab" }, "title"],
    ["a short description", { description: "too short" }, "description"],
    ["an unknown type", { type: "STOLEN" }, "type"],
    ["a missing category", { categoryId: "" }, "categoryId"],
    ["an unknown category", { categoryId: "category-that-does-not-exist" }, "categoryId"],
    ["an unknown location", { locationId: "location-that-does-not-exist" }, "locationId"],
    ["a date in the future", { dateLostOrFound: new Date(Date.now() + 3 * DAY).toISOString() }, "dateLostOrFound"],
    ["a date before the year 2000", { dateLostOrFound: "1999-12-31" }, "dateLostOrFound"],
    ["a date that is not a date", { dateLostOrFound: "yesterday" }, "dateLostOrFound"],
    ["a field it does not know", { status: "RESOLVED" }, undefined],
    ["a poster id", { posterId: "someone-else" }, undefined],
  ])("rejects %s and creates nothing", async (_label, override, field) => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/items", await newItemPayload(override));

    expect(result.status).toBe(400);
    expect(result.body.error).toBeTruthy();
    if (field) expect(result.body.fields).toHaveProperty(field);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(0);
  });

  it("rejects more than five files and the same file twice", async () => {
    const { user, client } = await createSignedInUser();
    const keys = Array.from({ length: 6 }, () => buildObjectKey("item", user.id, "image/jpeg"));

    const tooMany = await client.post<ErrorBody>("/api/items", await newItemPayload({ mediaKeys: keys }));
    const repeated = await client.post<ErrorBody>("/api/items", await newItemPayload({ mediaKeys: [keys[0], keys[0]] }));

    expect(tooMany.status).toBe(400);
    expect(repeated.status).toBe(400);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(0);
  });

  it("rejects signed-out requests and foreign origins", async () => {
    const { user, client } = await createSignedInUser();

    expect((await new ApiClient().post("/api/items", await newItemPayload())).status).toBe(401);
    expect(
      (await client.post("/api/items", await newItemPayload(), { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect(await db.item.count({ where: { posterId: user.id } })).toBe(0);
  });

  it("limits how many items one user can publish in a day, counting concurrent requests exactly", async () => {
    const { client } = await createSignedInUser();
    const { max } = ITEM_CREATE_LIMIT;
    const payload = await newItemPayload();

    const allowed = await Promise.all(Array.from({ length: max }, () => client.post("/api/items", payload)));
    expect(allowed.map((result) => result.status)).toEqual(Array(max).fill(201));

    const blocked = await client.post<ErrorBody>("/api/items", payload);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("does not count a rejected request against the daily limit", async () => {
    const { client } = await createSignedInUser();
    const { max } = ITEM_CREATE_LIMIT;

    await Promise.all(Array.from({ length: max }, async () => client.post("/api/items", await newItemPayload({ title: "ab" }))));

    expect((await client.post("/api/items", await newItemPayload())).status).toBe(201);
  });
});

describe("PATCH /api/items/:id", () => {
  async function ownedItem(overrides: Parameters<typeof createItem>[1] = {}) {
    const { user, client } = await createSignedInUser();
    return { user, client, item: await createItem(user.id, overrides) };
  }

  it("changes only the fields that were sent", async () => {
    const { client, item } = await ownedItem({ title: "Old title", description: "Unchanged description text" });

    const result = await client.patch<DetailBody>(`/api/items/${item.id}`, { title: "  New title  " });

    expect(result.status).toBe(200);
    expect(result.body.item).toMatchObject({
      id: item.id,
      title: "New title",
      description: "Unchanged description text",
      isOwner: true,
    });
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).title).toBe("New title");
  });

  it("changes category, location and date, and clears the note", async () => {
    const { client, item } = await ownedItem({ locationNote: "Old note" });
    const { category, location } = await createScope();

    const result = await client.patch<DetailBody>(`/api/items/${item.id}`, {
      categoryId: category.id,
      locationId: location.id,
      dateLostOrFound: "2026-09-30",
      locationNote: null,
    });

    expect(result.status).toBe(200);
    expect(result.body.item).toMatchObject({
      category: category.name,
      location: location.name,
      date: "2026-09-30T00:00:00.000Z",
      locationNote: null,
    });
  });

  it("treats a blank note as clearing it", async () => {
    const { client, item } = await ownedItem({ locationNote: "Old note" });

    const result = await client.patch<DetailBody>(`/api/items/${item.id}`, { locationNote: "  " });

    expect(result.body.item.locationNote).toBeNull();
  });

  it("answers an identical repeat with the same result", async () => {
    const { client, item } = await ownedItem();
    const change = { title: "Same title again", locationNote: "Same note" };

    const first = await client.patch<DetailBody>(`/api/items/${item.id}`, change);
    const repeat = await client.patch<DetailBody>(`/api/items/${item.id}`, change);

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
  });

  it("refuses everyone but the owner", async () => {
    const { item } = await ownedItem({ title: "Owner's title" });
    const { client: stranger } = await createSignedInUser();
    const removed = await createItem((await createUser()).id, { status: "REMOVED", title: "Hidden title" });

    const asStranger = await stranger.patch<ErrorBody>(`/api/items/${item.id}`, { title: "Hijacked" });
    const anonymous = await new ApiClient().patch<ErrorBody>(`/api/items/${item.id}`, { title: "Hijacked" });
    const unknown = await stranger.patch<ErrorBody>("/api/items/does-not-exist", { title: "Whatever" });
    const hidden = await stranger.patch<ErrorBody>(`/api/items/${removed.id}`, { title: "Whatever" });

    expect(asStranger.status).toBe(403);
    expect(asStranger.body.error).toBe("Only the poster can edit this item.");
    expect(anonymous.status).toBe(401);
    expect(unknown.status).toBe(404);
    expect(hidden.status).toBe(404);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).title).toBe("Owner's title");
  });

  it.each([
    ["CLAIMED", "claim was approved"],
    ["RESOLVED", "already returned"],
    ["REMOVED", "was removed"],
  ] as const)("refuses an edit once the item is %s", async (status, message) => {
    const { client, item } = await ownedItem({ status, title: "Frozen title" });

    const result = await client.patch<ErrorBody>(`/api/items/${item.id}`, { title: "Too late" });

    expect(result.status).toBe(409);
    expect(result.body.error).toContain(message);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).title).toBe("Frozen title");
  });

  it.each([
    ["an empty change", {}, undefined],
    ["a status change", { status: "RESOLVED" }, undefined],
    ["a type change", { type: "FOUND" }, undefined],
    ["a poster change", { posterId: "someone-else" }, undefined],
    ["media changes", { mediaKeys: ["a"] }, undefined],
    ["a short title", { title: "ab" }, "title"],
    ["an unknown category", { categoryId: "category-that-does-not-exist" }, "categoryId"],
    ["an unknown location", { locationId: "location-that-does-not-exist" }, "locationId"],
    ["a future date", { dateLostOrFound: new Date(Date.now() + 3 * DAY).toISOString() }, "dateLostOrFound"],
  ])("rejects %s and changes nothing", async (_label, body, field) => {
    const { client, item } = await ownedItem({ title: "Stable title" });

    const result = await client.patch<ErrorBody>(`/api/items/${item.id}`, body);

    expect(result.status).toBe(400);
    if (field) expect(result.body.fields).toHaveProperty(field);
    const stored = await db.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(stored).toMatchObject({ title: "Stable title", status: "OPEN", type: "LOST" });
  });

  it("blocks a foreign Origin", async () => {
    const { client, item } = await ownedItem({ title: "Stable title" });

    const result = await client.patch(`/api/items/${item.id}`, { title: "Changed" }, { origin: "https://evil.example" });

    expect(result.status).toBe(403);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).title).toBe("Stable title");
  });
});

describe("DELETE /api/items/:id", () => {
  async function ownedItem(overrides: Parameters<typeof createItem>[1] = {}) {
    const { user, client } = await createSignedInUser();
    return { user, client, item: await createItem(user.id, overrides) };
  }

  it("removes an open item, closes its pending claims and leaves decided claims alone", async () => {
    const { client, item } = await ownedItem();
    const [pending, rejected, cancelled] = await Promise.all([createUser(), createUser(), createUser()]);
    await createClaim(item.id, pending.id, { status: "PENDING" });
    await createClaim(item.id, rejected.id, { status: "REJECTED", decidedAt: new Date("2026-10-01T10:00:00Z") });
    await createClaim(item.id, cancelled.id, { status: "CANCELLED", decidedAt: new Date("2026-10-01T11:00:00Z") });

    const result = await client.delete<{ item: { id: string; status: string } }>(`/api/items/${item.id}`);

    expect(result.status).toBe(200);
    expect(result.body.item).toEqual({ id: item.id, status: "REMOVED" });
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("REMOVED");
    const claims = await db.claim.findMany({ where: { itemId: item.id } });
    const statusOf = (claimantId: string) => claims.find((claim) => claim.claimantId === claimantId);
    expect(statusOf(pending.id)).toMatchObject({ status: "CANCELLED" });
    expect(statusOf(pending.id)?.decidedAt).not.toBeNull();
    expect(statusOf(rejected.id)).toMatchObject({ status: "REJECTED", decidedAt: new Date("2026-10-01T10:00:00Z") });
    expect(statusOf(cancelled.id)).toMatchObject({ status: "CANCELLED", decidedAt: new Date("2026-10-01T11:00:00Z") });
  });

  it("answers a repeat with the same result", async () => {
    const { client, item } = await ownedItem();

    const first = await client.delete<{ item: { id: string; status: string } }>(`/api/items/${item.id}`);
    const repeat = await client.delete<{ item: { id: string; status: string } }>(`/api/items/${item.id}`);

    expect(first.status).toBe(200);
    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
  });

  it("treats two racing deletes as one", async () => {
    const { client, item } = await ownedItem();
    await createClaim(item.id, (await createUser()).id, { status: "PENDING" });

    const results = await Promise.all([
      client.delete(`/api/items/${item.id}`),
      client.delete(`/api/items/${item.id}`),
      client.delete(`/api/items/${item.id}`),
    ]);

    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect(await db.claim.count({ where: { itemId: item.id, status: "CANCELLED" } })).toBe(1);
  });

  it("disappears from search and the public detail, but the owner can still open it", async () => {
    const { client, item } = await ownedItem();
    await client.delete(`/api/items/${item.id}`);

    const search = await new ApiClient().get<{ items: { id: string }[] }>(`/api/items?q=${encodeURIComponent(item.title)}`);
    const publicView = await new ApiClient().get(`/api/items/${item.id}`);
    const ownerView = await client.get<DetailBody>(`/api/items/${item.id}`);
    const mine = await client.get<{ items: { id: string }[] }>("/api/me/items");

    expect(search.body.items.map((found) => found.id)).not.toContain(item.id);
    expect(publicView.status).toBe(404);
    expect(ownerView.body.item.status).toBe("REMOVED");
    expect(mine.body.items.map((found) => found.id)).not.toContain(item.id);
  });

  it("refuses everyone but the owner", async () => {
    const { item } = await ownedItem();
    const { client: stranger } = await createSignedInUser();

    const asStranger = await stranger.delete<ErrorBody>(`/api/items/${item.id}`);
    const anonymous = await new ApiClient().delete<ErrorBody>(`/api/items/${item.id}`);
    const unknown = await stranger.delete<ErrorBody>("/api/items/does-not-exist");

    expect(asStranger.status).toBe(403);
    expect(anonymous.status).toBe(401);
    expect(unknown.status).toBe(404);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it("hides a removed item's existence from other people", async () => {
    const removed = await createItem((await createUser()).id, { status: "REMOVED" });
    const { client: stranger } = await createSignedInUser();

    expect((await stranger.delete<ErrorBody>(`/api/items/${removed.id}`)).status).toBe(404);
  });

  it.each([
    ["CLAIMED", "Cancel the handover first"],
    ["RESOLVED", "already returned"],
  ] as const)("refuses to remove an item that is %s", async (status, message) => {
    const { client, item } = await ownedItem({ status });

    const result = await client.delete<ErrorBody>(`/api/items/${item.id}`);

    expect(result.status).toBe(409);
    expect(result.body.error).toContain(message);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe(status);
  });

  it("blocks a foreign Origin", async () => {
    const { client, item } = await ownedItem();

    const result = await client.delete(`/api/items/${item.id}`, { origin: "https://evil.example" });

    expect(result.status).toBe(403);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });
});

describe("GET /api/me/items", () => {
  it("lists the user's own items newest first with claim counts, leaving out removed ones", async () => {
    const { user, client } = await createSignedInUser();
    const other = await createUser();
    const older = await createItem(user.id, { title: "Older", createdAt: new Date(Date.now() - 60_000) });
    const newer = await createItem(user.id, { title: "Newer" });
    await createItem(user.id, { title: "Removed", status: "REMOVED" });
    await createItem(other.id, { title: "Someone else's" });
    await createClaim(newer.id, (await createUser()).id, { status: "PENDING" });
    await createClaim(newer.id, (await createUser()).id, { status: "REJECTED" });

    const result = await client.get<{ items: { id: string; title: string; claimCount: number; status: string }[] }>(
      "/api/me/items",
    );

    expect(result.status).toBe(200);
    expect(result.body.items.map((item) => [item.id, item.claimCount])).toEqual([
      [newer.id, 2],
      [older.id, 0],
    ]);
    expect(result.body.items[0]).toHaveProperty("eventDate");
    expect(result.body.items[0]).not.toHaveProperty("_count");
  });

  it("is empty for a user with no items", async () => {
    const { client } = await createSignedInUser();

    expect((await client.get<{ items: unknown[] }>("/api/me/items")).body.items).toEqual([]);
  });
});
