import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ItemStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import { createAdmin, createClaim, createClaimScenario, createItem, createSignedInUser, createUser } from "./support/factories";

interface AdminItem {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  poster: { id: string; name: string | null; email: string };
  claimCount: number;
  openReports: number;
}

interface AdminItemsBody {
  items: AdminItem[];
  nextCursor: string | null;
  total: number;
}

interface RemovalBody {
  item: { id: string; status: string };
}

interface ErrorBody {
  error: string;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const newTag = () => randomUUID().slice(0, 8);
const listItems = (client: ApiClient, tag: string, query = "") =>
  client.get<AdminItemsBody>(`/api/admin/items?q=${tag}${query}`);

async function reportBy(itemId: string, status: "OPEN" | "DISMISSED" = "OPEN") {
  return db.report.create({ data: { itemId, reporterId: (await createUser()).id, reason: "spam", status } });
}

async function approvedScenario() {
  const scenario = await createClaimScenario();
  const approval = await scenario.posterClient.patch(`/api/claims/${scenario.claim.id}`, { decision: "APPROVE" });
  expect(approval.status).toBe(200);
  return scenario;
}

describe("GET /api/admin/items", () => {
  it("lists posts of every status newest first with the poster and the claim and report counts", async () => {
    const { client } = await createAdmin();
    const tag = newTag();
    const poster = await createUser({ name: "Poster Person" });
    const open = await createItem(poster.id, { title: `Keys ${tag}`, createdAt: minutesAgo(1) });
    const claimed = await createItem(poster.id, { title: `Bag ${tag}`, status: "CLAIMED", createdAt: minutesAgo(2) });
    const resolved = await createItem(poster.id, {
      title: `Phone ${tag}`,
      type: "FOUND",
      status: "RESOLVED",
      createdAt: minutesAgo(3),
    });
    const removed = await createItem(poster.id, { title: `Card ${tag}`, status: "REMOVED", createdAt: minutesAgo(4) });
    await createClaim(open.id, (await createUser()).id);
    await createClaim(open.id, (await createUser()).id, { status: "REJECTED" });
    await reportBy(open.id);
    await reportBy(open.id);
    await reportBy(open.id, "DISMISSED");

    const result = await listItems(client, tag);

    expect(result.status).toBe(200);
    expect(result.body.items.map((item) => item.id)).toEqual([open.id, claimed.id, resolved.id, removed.id]);
    expect(result.body.items.map((item) => item.status)).toEqual(["OPEN", "CLAIMED", "RESOLVED", "REMOVED"]);
    expect(result.body).toMatchObject({ nextCursor: null, total: 4 });
    expect(result.body.items[0]).toMatchObject({
      title: `Keys ${tag}`,
      type: "LOST",
      poster: { id: poster.id, name: "Poster Person", email: poster.email },
      claimCount: 2,
      openReports: 2,
    });
    expect(result.body.items[2]).toMatchObject({ type: "FOUND", claimCount: 0, openReports: 0 });
    expect(Object.keys(result.body.items[0]).sort()).toEqual([
      "claimCount",
      "createdAt",
      "id",
      "openReports",
      "poster",
      "status",
      "title",
      "type",
    ]);
    const text = JSON.stringify(result.body);
    expect(text).not.toContain("password");
    if (poster.phone) expect(text).not.toContain(poster.phone);
  });

  it("filters by status, type and text without caring about case", async () => {
    const { client } = await createAdmin();
    const tag = newTag();
    const poster = await createUser();
    const lostKeys = await createItem(poster.id, { title: `Lost keys ${tag}`, createdAt: minutesAgo(1) });
    const foundKeys = await createItem(poster.id, { title: `Found keys ${tag}`, type: "FOUND", createdAt: minutesAgo(2) });
    const removedBag = await createItem(poster.id, {
      title: `Black bag ${tag}`,
      status: "REMOVED",
      createdAt: minutesAgo(3),
    });
    const idsFor = async (query: string) => (await listItems(client, tag, query)).body.items.map((item) => item.id);

    expect(await idsFor("&status=REMOVED")).toEqual([removedBag.id]);
    expect(await idsFor("&type=FOUND")).toEqual([foundKeys.id]);
    expect(await idsFor("&type=LOST&status=OPEN")).toEqual([lostKeys.id]);
    expect(await idsFor("&type=LOST")).toEqual([lostKeys.id, removedBag.id]);
    expect((await listItems(client, tag, "&type=LOST")).body.total).toBe(2);
    expect(await idsFor("&status=CLAIMED")).toEqual([]);
    const byText = await client.get<AdminItemsBody>(`/api/admin/items?q=${encodeURIComponent(`KEYS ${tag}`)}`);
    expect(byText.body.items.map((item) => item.id)).toEqual([lostKeys.id, foundKeys.id]);
  });

  it("pages with a cursor without repeating or skipping posts and reports the same total on every page", async () => {
    const { client } = await createAdmin();
    const tag = newTag();
    const poster = await createUser();
    const items = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createItem(poster.id, { title: `Page ${tag}`, createdAt: minutesAgo(index + 1) }),
      ),
    );

    const first = await listItems(client, tag, "&limit=2");
    const second = await listItems(client, tag, `&limit=2&cursor=${first.body.nextCursor}`);
    const third = await listItems(client, tag, `&limit=2&cursor=${second.body.nextCursor}`);

    expect(first.body.items.map((item) => item.id)).toEqual([items[0].id, items[1].id]);
    expect(second.body.items.map((item) => item.id)).toEqual([items[2].id, items[3].id]);
    expect(third.body.items.map((item) => item.id)).toEqual([items[4].id]);
    expect([first.body.nextCursor, second.body.nextCursor, third.body.nextCursor]).toEqual([items[1].id, items[3].id, null]);
    expect([first.body.total, second.body.total, third.body.total]).toEqual([5, 5, 5]);
  });

  it("caps an oversized limit", async () => {
    const { client } = await createAdmin();

    const result = await client.get<AdminItemsBody>("/api/admin/items?limit=500");

    expect(result.status).toBe(200);
    expect(result.body.items.length).toBeLessThanOrEqual(50);
  });

  it.each([
    ["an unknown status", "status=ALL"],
    ["an unknown type", "type=GOLD"],
    ["a zero limit", "limit=0"],
    ["a limit that is not a number", "limit=many"],
    ["a very long search", `q=${"x".repeat(101)}`],
  ])("rejects %s", async (_label, query) => {
    const { client } = await createAdmin();

    const result = await client.get<ErrorBody>(`/api/admin/items?${query}`);

    expect(result.status).toBe(400);
  });

  it("is for admins only", async () => {
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const forbidden = await student.get<ErrorBody>("/api/admin/items");

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe("Administrator access is required.");
    expect((await new ApiClient().get("/api/admin/items")).status).toBe(401);
  });
});

describe("PATCH /api/admin/items/:id/remove", () => {
  it.each<ItemStatus>(["OPEN", "CLAIMED", "RESOLVED"])("removes a %s post and hides it from the public", async (status) => {
    const { client } = await createAdmin();
    const item = await createItem((await createUser()).id, { status, title: `Hide ${newTag()}` });
    const visitor = new ApiClient();

    const result = await client.patch<RemovalBody>(`/api/admin/items/${item.id}/remove`);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ item: { id: item.id, status: "REMOVED" } });
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("REMOVED");
    expect((await visitor.get(`/api/items/${item.id}`)).status).toBe(404);
    const search = await visitor.get<AdminItemsBody>(`/api/items?q=${encodeURIComponent(item.title)}`);
    expect(search.body.items.map((found) => found.id)).not.toContain(item.id);
  });

  it("closes pending and approved claims and every open report, and keeps the other records", async () => {
    const { user: admin, client } = await createAdmin();
    const { item, claim, claimantClient } = await approvedScenario();
    const late = await createClaim(item.id, (await createUser()).id);
    const decidedAt = new Date("2026-10-01T10:00:00Z");
    const rejected = await createClaim(item.id, (await createUser()).id, { status: "REJECTED", decidedAt });
    const open = await reportBy(item.id);
    const dismissed = await reportBy(item.id, "DISMISSED");

    const result = await client.patch(`/api/admin/items/${item.id}/remove`);

    expect(result.status).toBe(200);
    const statusOf = async (id: string) => (await db.claim.findUniqueOrThrow({ where: { id } })).status;
    expect(await statusOf(claim.id)).toBe("CANCELLED");
    expect(await statusOf(late.id)).toBe("CANCELLED");
    expect(await db.claim.findUniqueOrThrow({ where: { id: rejected.id } })).toMatchObject({ status: "REJECTED", decidedAt });
    expect(await db.report.findUniqueOrThrow({ where: { id: open.id } })).toMatchObject({
      status: "ACTIONED",
      decidedById: admin.id,
    });
    expect((await db.report.findUniqueOrThrow({ where: { id: dismissed.id } })).status).toBe("DISMISSED");
    const handover = await claimantClient.get<{ handover: { status: string; contact: unknown; code: unknown } }>(
      `/api/claims/${claim.id}/handover`,
    );
    expect(handover.body.handover).toMatchObject({ status: "CANCELLED", contact: null, code: null });
  });

  it("answers a repeat with the same result and leaves everything as it was", async () => {
    const { client } = await createAdmin();
    const { item, claim } = await createClaimScenario();
    const first = await client.patch<RemovalBody>(`/api/admin/items/${item.id}/remove`);
    const claimAfterFirst = await db.claim.findUniqueOrThrow({ where: { id: claim.id } });

    const repeat = await client.patch<RemovalBody>(`/api/admin/items/${item.id}/remove`);

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect(await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).toEqual(claimAfterFirst);
  });

  it("closes the reports on a post its owner already removed", async () => {
    const { client } = await createAdmin();
    const { item, posterClient } = await createClaimScenario();
    const report = await reportBy(item.id);
    expect((await posterClient.delete(`/api/items/${item.id}`)).status).toBe(200);

    const result = await client.patch<RemovalBody>(`/api/admin/items/${item.id}/remove`);

    expect(result.status).toBe(200);
    expect((await db.report.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("ACTIONED");
  });

  it("settles two removals at once", async () => {
    const { client } = await createAdmin();
    const { item, claim } = await approvedScenario();

    const results = await Promise.all([
      client.patch(`/api/admin/items/${item.id}/remove`),
      client.patch(`/api/admin/items/${item.id}/remove`),
    ]);

    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("REMOVED");
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("CANCELLED");
  });

  it("leaves no live claim when the poster approves while an admin removes the post", async () => {
    const { client } = await createAdmin();
    const { item, claim, posterClient } = await createClaimScenario();

    const [removal, approval] = await Promise.all([
      client.patch(`/api/admin/items/${item.id}/remove`),
      posterClient.patch(`/api/claims/${claim.id}`, { decision: "APPROVE" }),
    ]);

    expect(removal.status).toBe(200);
    expect([200, 409]).toContain(approval.status);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("REMOVED");
    expect(await db.claim.count({ where: { itemId: item.id, status: { in: ["PENDING", "APPROVED"] } } })).toBe(0);
  });

  it("answers 404 for an unknown post", async () => {
    const { client } = await createAdmin();

    expect((await client.patch<ErrorBody>("/api/admin/items/does-not-exist/remove")).status).toBe(404);
  });

  it("is for admins only, including the poster of the post", async () => {
    const { user: poster, client: posterClient } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const item = await createItem(poster.id);
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    expect((await posterClient.patch(`/api/admin/items/${item.id}/remove`)).status).toBe(403);
    expect((await student.patch(`/api/admin/items/${item.id}/remove`)).status).toBe(403);
    expect((await new ApiClient().patch(`/api/admin/items/${item.id}/remove`)).status).toBe(401);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it("blocks a foreign Origin", async () => {
    const { client } = await createAdmin();
    const item = await createItem((await createUser()).id);

    const result = await client.patch(`/api/admin/items/${item.id}/remove`, undefined, { origin: "https://evil.example" });

    expect(result.status).toBe(403);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });
});
