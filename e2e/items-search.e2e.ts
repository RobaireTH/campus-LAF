import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import { createItem, createScope, createUser } from "./support/factories";

interface Card {
  id: string;
  title: string;
  type: string;
  category: string;
  location: string;
  date: string;
  status: string;
  thumbnailUrl: string | null;
}

interface ListBody {
  items: Card[];
  nextCursor: string | null;
  total: number;
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

const list = (query: string) => new ApiClient().get<ListBody>(`/api/items?${query}`);
const titlesOf = async (query: string) => (await list(query)).body.items.map((item) => item.title);
const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe("GET /api/items", () => {
  it("lists open items newest first with exactly the fields a card needs", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "Oldest umbrella", createdAt: secondsAgo(300) });
    await createItem(poster.id, { ...base, title: "Middle umbrella", createdAt: secondsAgo(200) });
    await createItem(poster.id, { ...base, title: "Newest umbrella", createdAt: secondsAgo(100) });

    const result = await list(`category=${category.id}`);

    expect(result.status).toBe(200);
    expect(result.body.items.map((item) => item.title)).toEqual(["Newest umbrella", "Middle umbrella", "Oldest umbrella"]);
    expect(result.body.total).toBe(3);
    expect(result.body.nextCursor).toBeNull();
    expect(Object.keys(result.body.items[0]).sort()).toEqual([
      "category",
      "date",
      "id",
      "location",
      "status",
      "thumbnailUrl",
      "title",
      "type",
    ]);
    expect(result.body.items[0]).toMatchObject({
      category: category.name,
      location: location.name,
      status: "OPEN",
      thumbnailUrl: null,
    });
  });

  it("is public and exposes nothing about the poster", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    await createItem(poster.id, { categoryId: category.id, locationId: location.id });

    const result = await list(`category=${category.id}`);

    const text = JSON.stringify(result.body);
    expect(result.status).toBe(200);
    expect(text).not.toContain(poster.email);
    expect(text).not.toContain(poster.id);
    expect(text).not.toContain("e2e.test");
  });

  it("lists only open items unless another visible status is asked for, and never removed ones", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "open item", status: "OPEN" });
    await createItem(poster.id, { ...base, title: "claimed item", status: "CLAIMED" });
    await createItem(poster.id, { ...base, title: "resolved item", status: "RESOLVED" });
    await createItem(poster.id, { ...base, title: "removed item", status: "REMOVED" });

    expect(await titlesOf(`category=${category.id}`)).toEqual(["open item"]);
    expect(await titlesOf(`category=${category.id}&status=CLAIMED`)).toEqual(["claimed item"]);
    expect(await titlesOf(`category=${category.id}&status=RESOLVED`)).toEqual(["resolved item"]);
    expect((await list(`category=${category.id}&status=REMOVED`)).status).toBe(400);
  });

  it("filters by lost or found", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "lost thing", type: "LOST" });
    await createItem(poster.id, { ...base, title: "found thing", type: "FOUND" });

    expect(await titlesOf(`category=${category.id}&type=LOST`)).toEqual(["lost thing"]);
    expect(await titlesOf(`category=${category.id}&type=FOUND`)).toEqual(["found thing"]);
  });

  it("filters by category and location ids", async () => {
    const first = await createScope();
    const second = await createScope();
    const poster = await createUser();
    await createItem(poster.id, { categoryId: first.category.id, locationId: first.location.id, title: "in first" });
    await createItem(poster.id, { categoryId: second.category.id, locationId: second.location.id, title: "in second" });

    expect(await titlesOf(`category=${first.category.id}`)).toEqual(["in first"]);
    expect(await titlesOf(`location=${second.location.id}`)).toEqual(["in second"]);
    expect(await titlesOf(`category=${first.category.id}&location=${second.location.id}`)).toEqual([]);
  });

  it("filters by the day an item was lost or found, including the whole last day", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "before", eventDate: new Date("2026-10-01T09:00:00Z") });
    await createItem(poster.id, { ...base, title: "first day", eventDate: new Date("2026-10-02T15:30:00Z") });
    await createItem(poster.id, { ...base, title: "last day, late", eventDate: new Date("2026-10-03T23:30:00Z") });
    await createItem(poster.id, { ...base, title: "after", eventDate: new Date("2026-10-04T00:00:00Z") });

    expect((await titlesOf(`category=${category.id}&from=2026-10-02&to=2026-10-03`)).sort()).toEqual([
      "first day",
      "last day, late",
    ]);
    expect((await titlesOf(`category=${category.id}&from=2026-10-03`)).sort()).toEqual(["after", "last day, late"]);
    expect((await titlesOf(`category=${category.id}&to=2026-10-02`)).sort()).toEqual(["before", "first day"]);
  });

  it("searches title, description, location note, category and location, ignoring case", async () => {
    const tag = randomUUID().slice(0, 8);
    const { category, location } = await createScope();
    const taggedCategory = await db.category.create({ data: { name: `Cat ${tag}` } });
    const taggedLocation = await db.location.create({ data: { name: `Spot ${tag}` } });
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: `Title ${tag}` });
    await createItem(poster.id, { ...base, title: "By description", description: `Mentions ${tag} somewhere` });
    await createItem(poster.id, { ...base, title: "By note", locationNote: `Near the ${tag} gate` });
    await createItem(poster.id, { ...base, title: "By category", categoryId: taggedCategory.id });
    await createItem(poster.id, { ...base, title: "By location", locationId: taggedLocation.id });
    await createItem(poster.id, { ...base, title: "Unrelated" });

    const result = await list(`q=${tag.toUpperCase()}`);

    expect(result.body.total).toBe(5);
    expect(result.body.items.map((item) => item.title)).not.toContain("Unrelated");
  });

  it("needs every word to match somewhere", async () => {
    const [one, two] = [randomUUID().slice(0, 8), randomUUID().slice(0, 8)];
    const category = (await createScope()).category;
    const hall = await db.location.create({ data: { name: `Hall ${two}` } });
    const elsewhere = await db.location.create({ data: { name: `Yard ${randomUUID().slice(0, 8)}` } });
    const poster = await createUser();
    await createItem(poster.id, { categoryId: category.id, locationId: hall.id, title: `${one} umbrella` });
    await createItem(poster.id, { categoryId: category.id, locationId: elsewhere.id, title: `${one} bottle` });

    expect(await titlesOf(`q=${one}%20${two}`)).toEqual([`${one} umbrella`]);
    expect((await titlesOf(`q=${one}`)).sort()).toEqual([`${one} bottle`, `${one} umbrella`]);
    expect(await titlesOf(`q=${one}%20nomatch${one}`)).toEqual([]);
  });

  it("treats percent and underscore in a search as plain characters", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "100% sure it is mine" });
    await createItem(poster.id, { ...base, title: "1000 reasons it is mine" });
    await createItem(poster.id, { ...base, title: "plain title" });

    expect(await titlesOf(`category=${category.id}&q=%25`)).toEqual(["100% sure it is mine"]);
    expect(await titlesOf(`category=${category.id}&q=100%25`)).toEqual(["100% sure it is mine"]);
    expect(await titlesOf(`category=${category.id}&q=_`)).toEqual([]);
  });

  it("sorts oldest first when asked", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    await createItem(poster.id, { ...base, title: "older", createdAt: secondsAgo(200) });
    await createItem(poster.id, { ...base, title: "newer", createdAt: secondsAgo(100) });

    expect(await titlesOf(`category=${category.id}&sort=oldest`)).toEqual(["older", "newer"]);
    expect(await titlesOf(`category=${category.id}&sort=newest`)).toEqual(["newer", "older"]);
  });

  it("pages with a cursor without gaps or repeats and reports the same total on every page", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    for (let index = 0; index < 5; index += 1) {
      await createItem(poster.id, { ...base, title: `item ${index}`, createdAt: secondsAgo(1000 - index * 10) });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const result: Awaited<ReturnType<typeof list>> = await list(
        `category=${category.id}&limit=2${cursor ? `&cursor=${cursor}` : ""}`,
      );
      expect(result.status).toBe(200);
      expect(result.body.total).toBe(5);
      seen.push(...result.body.items.map((item) => item.title));
      cursor = result.body.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toEqual(["item 4", "item 3", "item 2", "item 1", "item 0"]);
  });

  it("caps the page size instead of failing", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    await createItem(poster.id, { categoryId: category.id, locationId: location.id });

    const result = await list(`category=${category.id}&limit=500`);

    expect(result.status).toBe(200);
    expect(result.body.items.length).toBeLessThanOrEqual(50);
  });

  it("answers an unknown cursor with an empty page", async () => {
    const result = await list("cursor=not-a-real-item");

    expect(result.status).toBe(200);
    expect(result.body.items).toEqual([]);
  });

  it.each([
    "type=GOLD",
    "type=lost",
    "status=ALL",
    "sort=sideways",
    "from=01/10/2026",
    "to=2026-13-45",
    "limit=0",
    "limit=abc",
    "limit=2.5",
    `q=${"x".repeat(101)}`,
  ])("rejects the filter %s with a message", async (query) => {
    const result = await new ApiClient().get<ErrorBody>(`/api/items?${query}`);

    expect(result.status).toBe(400);
    expect(result.body.error).toBeTruthy();
  });

  it("gives a signed thumbnail link from the first image only", async () => {
    const { category, location } = await createScope();
    const poster = await createUser();
    const base = { categoryId: category.id, locationId: location.id };
    const withPhotos = await createItem(poster.id, { ...base, title: "With photos" });
    const firstImage = buildObjectKey("item", poster.id, "image/jpeg");
    await db.itemMedia.createMany({
      data: [
        { itemId: withPhotos.id, key: buildObjectKey("item", poster.id, "video/mp4"), type: "VIDEO", position: 0 },
        { itemId: withPhotos.id, key: firstImage, type: "IMAGE", position: 1 },
        { itemId: withPhotos.id, key: buildObjectKey("item", poster.id, "image/png"), type: "IMAGE", position: 2 },
      ],
    });
    const videoOnly = await createItem(poster.id, { ...base, title: "Video only" });
    await db.itemMedia.create({
      data: { itemId: videoOnly.id, key: buildObjectKey("item", poster.id, "video/webm"), type: "VIDEO", position: 0 },
    });

    const result = await list(`category=${category.id}`);

    const byTitle = Object.fromEntries(result.body.items.map((item) => [item.title, item]));
    expect(byTitle["With photos"].thumbnailUrl).toContain(firstImage);
    expect(byTitle["With photos"].thumbnailUrl).toContain("X-Amz-Signature=");
    expect(byTitle["Video only"].thumbnailUrl).toBeNull();
  });
});
