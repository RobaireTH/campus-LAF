import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { REPORT_CREATE_LIMIT } from "@/lib/moderation/limits";

import { ApiClient } from "./support/client";
import {
  createAdmin,
  createClaim,
  createClaimScenario,
  createItem,
  createSignedInUser,
  createUser,
} from "./support/factories";

interface ReportBody {
  report: { id: string; status: string };
}

interface QueueEntry {
  id: string;
  reason: string;
  reasonLabel: string;
  details?: string;
  createdAt: string;
  item: { id: string; title: string; status: string };
  reporter: { name: string };
}

interface DecisionBody {
  report: { id: string; status: string; decidedAt: string | null };
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function reportedItem() {
  const { user: poster, client: posterClient } = await createSignedInUser({ name: "Poster Person", kycStatus: "VERIFIED" });
  const item = await createItem(poster.id, { title: `Reported ${poster.id.slice(-6)}` });
  const { user: reporter } = await createSignedInUser({ name: "Reporter Person" });
  const report = await db.report.create({ data: { itemId: item.id, reporterId: reporter.id, reason: "spam" } });
  return { poster, posterClient, item, reporter, report };
}

describe("POST /api/items/:id/reports", () => {
  it("records a report for admins, trimming the details", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await createSignedInUser();

    const result = await client.post<ReportBody>(`/api/items/${item.id}/reports`, {
      reason: "fake",
      details: "  Looks like a scam listing  ",
    });

    expect(result.status).toBe(201);
    expect(result.body.report.status).toBe("OPEN");
    const stored = await db.report.findUniqueOrThrow({ where: { id: result.body.report.id } });
    expect(stored).toMatchObject({
      itemId: item.id,
      reporterId: user.id,
      reason: "fake",
      details: "Looks like a scam listing",
      status: "OPEN",
    });
  });

  it("stores blank details as none", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser();

    const result = await client.post<ReportBody>(`/api/items/${item.id}/reports`, { reason: "spam", details: "  " });

    expect((await db.report.findUniqueOrThrow({ where: { id: result.body.report.id } })).details).toBeNull();
  });

  it("answers a repeat from the same person with the same report, even with another reason", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await createSignedInUser();
    const first = await client.post<ReportBody>(`/api/items/${item.id}/reports`, { reason: "spam" });

    const repeat = await client.post<ReportBody>(`/api/items/${item.id}/reports`, { reason: "offensive" });

    expect(first.status).toBe(201);
    expect(repeat.status).toBe(200);
    expect(repeat.body.report.id).toBe(first.body.report.id);
    expect(await db.report.count({ where: { itemId: item.id, reporterId: user.id } })).toBe(1);
    expect((await db.report.findUniqueOrThrow({ where: { id: first.body.report.id } })).reason).toBe("spam");
  });

  it("creates one report when identical requests race", async () => {
    const item = await createItem((await createUser()).id);
    const { user, client } = await createSignedInUser();

    const results = await Promise.all([
      client.post(`/api/items/${item.id}/reports`, { reason: "spam" }),
      client.post(`/api/items/${item.id}/reports`, { reason: "spam" }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(await db.report.count({ where: { itemId: item.id, reporterId: user.id } })).toBe(1);
  });

  it("lets different people report the same post", async () => {
    const item = await createItem((await createUser()).id);
    const [first, second] = await Promise.all([createSignedInUser(), createSignedInUser()]);

    await first.client.post(`/api/items/${item.id}/reports`, { reason: "spam" });
    await second.client.post(`/api/items/${item.id}/reports`, { reason: "fake" });

    expect(await db.report.count({ where: { itemId: item.id } })).toBe(2);
  });

  it.each([
    ["a missing reason", {}],
    ["an unknown reason", { reason: "rude" }],
    ["very long details", { reason: "spam", details: "x".repeat(501) }],
    ["a field it does not know", { reason: "spam", itemId: "someone-else" }],
  ])("rejects %s", async (_label, body) => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>(`/api/items/${item.id}/reports`, body);

    expect(result.status).toBe(400);
    expect(await db.report.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("refuses a report on your own post and hides removed or unknown posts", async () => {
    const { user, client } = await createSignedInUser();
    const own = await createItem(user.id);
    const removed = await createItem((await createUser()).id, { status: "REMOVED" });

    expect((await client.post<ErrorBody>(`/api/items/${own.id}/reports`, { reason: "spam" })).status).toBe(403);
    expect((await client.post(`/api/items/${removed.id}/reports`, { reason: "spam" })).status).toBe(404);
    expect((await client.post("/api/items/does-not-exist/reports", { reason: "spam" })).status).toBe(404);
    expect(await db.report.count({ where: { reporterId: user.id } })).toBe(0);
  });

  it("rejects signed-out requests and foreign origins", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser();

    expect((await new ApiClient().post(`/api/items/${item.id}/reports`, { reason: "spam" })).status).toBe(401);
    expect(
      (await client.post(`/api/items/${item.id}/reports`, { reason: "spam" }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect(await db.report.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("limits how many reports one person can file in a day, counting concurrent requests exactly", async () => {
    const poster = await createUser();
    const { client } = await createSignedInUser();
    const { max } = REPORT_CREATE_LIMIT;
    const items = await Promise.all(Array.from({ length: max + 1 }, () => createItem(poster.id)));

    const allowed = await Promise.all(
      items.slice(0, max).map((item) => client.post(`/api/items/${item.id}/reports`, { reason: "spam" })),
    );
    expect(allowed.map((result) => result.status)).toEqual(Array(max).fill(201));

    const blocked = await client.post<ErrorBody>(`/api/items/${items[max].id}/reports`, { reason: "spam" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("never tells the poster or the public who reported", async () => {
    const { posterClient, item, reporter } = await reportedItem();

    const responses = [
      await posterClient.get(`/api/items/${item.id}`),
      await posterClient.get(`/api/items/${item.id}/claims`),
      await posterClient.get("/api/me/items"),
      await new ApiClient().get(`/api/items?q=${encodeURIComponent(item.title)}`),
    ];

    for (const response of responses) {
      expect(response.status).toBe(200);
      const text = JSON.stringify(response.body);
      for (const secret of [reporter.id, reporter.email, "Reporter Person"]) {
        expect(text).not.toContain(secret);
      }
    }
  });
});

describe("GET /api/admin/reports", () => {
  it("lists open reports oldest first with the reporter, reason and post", async () => {
    const { client } = await createAdmin();
    const poster = await createUser();
    const first = await createItem(poster.id, { title: "First reported post" });
    const second = await createItem(poster.id, { title: "Second reported post" });
    const done = await createItem(poster.id, { title: "Handled post" });
    const { user: reporterOne } = await createSignedInUser({ name: "Ada Reporter" });
    const { user: reporterTwo } = await createSignedInUser({ name: null });
    const older = await db.report.create({
      data: { itemId: first.id, reporterId: reporterOne.id, reason: "fake", details: "Seems made up", createdAt: minutesAgo(20) },
    });
    const newer = await db.report.create({
      data: { itemId: second.id, reporterId: reporterTwo.id, reason: "personal", createdAt: minutesAgo(5) },
    });
    await db.report.create({ data: { itemId: done.id, reporterId: reporterOne.id, reason: "spam", status: "DISMISSED" } });
    const ours = [older.id, newer.id];

    const result = await client.get<{ reports: QueueEntry[] }>("/api/admin/reports");

    expect(result.status).toBe(200);
    const queue = result.body.reports.filter((entry) => ours.includes(entry.id) || entry.item.id === done.id);
    expect(queue.map((entry) => entry.id)).toEqual(ours);
    expect(queue[0]).toMatchObject({
      reason: "fake",
      reasonLabel: "Looks fake or misleading",
      details: "Seems made up",
      item: { id: first.id, title: "First reported post", status: "OPEN" },
      reporter: { name: "Ada Reporter" },
    });
    expect(queue[1]).toMatchObject({ reporter: { name: "Anonymous" }, reasonLabel: "Shows someone's private details" });
    expect(queue[1]).not.toHaveProperty("details");
    const text = JSON.stringify(queue);
    expect(text).not.toContain(reporterOne.email);
    expect(text).not.toContain(reporterOne.id);
  });

  it("is for admins only", async () => {
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    expect((await student.get("/api/admin/reports")).status).toBe(403);
    expect((await new ApiClient().get("/api/admin/reports")).status).toBe(401);
  });
});

describe("PATCH /api/admin/reports/:id dismissing", () => {
  it("dismisses only that report and leaves the post alone", async () => {
    const { user: admin, client } = await createAdmin();
    const { item, report } = await reportedItem();
    const other = await db.report.create({ data: { itemId: item.id, reporterId: (await createUser()).id, reason: "fake" } });

    const result = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "DISMISS" });

    expect(result.status).toBe(200);
    expect(result.body.report).toMatchObject({ id: report.id, status: "DISMISSED" });
    expect(await db.report.findUniqueOrThrow({ where: { id: report.id } })).toMatchObject({
      status: "DISMISSED",
      decidedById: admin.id,
    });
    expect((await db.report.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("OPEN");
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it("answers a repeat with the same result and then refuses to remove the post", async () => {
    const { client } = await createAdmin();
    const { report } = await reportedItem();
    const first = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "DISMISS" });

    const repeat = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "DISMISS" });
    const lateRemoval = await client.patch<ErrorBody>(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" });

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect(lateRemoval.status).toBe(409);
    expect(lateRemoval.body.error).toBe("This report was already dismissed.");
  });
});

describe("PATCH /api/admin/reports/:id removing the post", () => {
  it("removes the post, closes every open report on it and cancels its claims, including an approved handover", async () => {
    const { user: admin, client } = await createAdmin();
    const { item, claim, claimantClient, posterClient } = await createClaimScenario();
    await posterClient.patch(`/api/claims/${claim.id}`, { decision: "APPROVE" });
    const pending = await createClaim(item.id, (await createUser()).id);
    const rejected = await createClaim(item.id, (await createUser()).id, { status: "REJECTED", decidedAt: new Date("2026-10-01T10:00:00Z") });
    const report = await db.report.create({ data: { itemId: item.id, reporterId: (await createUser()).id, reason: "fake" } });
    const sibling = await db.report.create({ data: { itemId: item.id, reporterId: (await createUser()).id, reason: "spam" } });

    const result = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" });

    expect(result.status).toBe(200);
    expect(result.body.report).toMatchObject({ id: report.id, status: "ACTIONED" });
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("REMOVED");
    expect(await db.report.findUniqueOrThrow({ where: { id: sibling.id } })).toMatchObject({ status: "ACTIONED", decidedById: admin.id });
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("CANCELLED");
    expect((await db.claim.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("CANCELLED");
    expect(await db.claim.findUniqueOrThrow({ where: { id: rejected.id } })).toMatchObject({
      status: "REJECTED",
      decidedAt: new Date("2026-10-01T10:00:00Z"),
    });
    const handover = await claimantClient.get<{ handover: { status: string; contact: unknown } }>(`/api/claims/${claim.id}/handover`);
    expect(handover.body.handover).toMatchObject({ status: "CANCELLED", contact: null });
  });

  it("answers a repeat with the same result", async () => {
    const { client } = await createAdmin();
    const { report } = await reportedItem();
    const first = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" });

    const repeat = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" });

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
  });

  it("still closes the report when the post was already removed", async () => {
    const { client } = await createAdmin();
    const { item, report } = await reportedItem();
    await db.item.update({ where: { id: item.id }, data: { status: "REMOVED" } });

    const result = await client.patch<DecisionBody>(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" });

    expect(result.status).toBe(200);
    expect(result.body.report.status).toBe("ACTIONED");
  });

  it("settles a dismissal racing a removal with one winner and a consistent post", async () => {
    const { client } = await createAdmin();
    const { item, report } = await reportedItem();

    const results = await Promise.all([
      client.patch(`/api/admin/reports/${report.id}`, { decision: "DISMISS" }),
      client.patch(`/api/admin/reports/${report.id}`, { decision: "REMOVE_ITEM" }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await db.report.findUniqueOrThrow({ where: { id: report.id } });
    const itemStatus = (await db.item.findUniqueOrThrow({ where: { id: item.id } })).status;
    expect([stored.status, itemStatus]).toEqual(stored.status === "DISMISSED" ? ["DISMISSED", "OPEN"] : ["ACTIONED", "REMOVED"]);
  });
});

describe("PATCH /api/admin/reports/:id authorization and input", () => {
  it("is for admins only", async () => {
    const { report, item } = await reportedItem();
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    for (const decision of ["DISMISS", "REMOVE_ITEM"]) {
      expect((await student.patch(`/api/admin/reports/${report.id}`, { decision })).status).toBe(403);
    }
    expect((await new ApiClient().patch(`/api/admin/reports/${report.id}`, { decision: "DISMISS" })).status).toBe(401);
    expect((await db.report.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("OPEN");
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it("rejects unknown reports, bad decisions and foreign origins", async () => {
    const { client } = await createAdmin();
    const { report } = await reportedItem();

    expect((await client.patch("/api/admin/reports/does-not-exist", { decision: "DISMISS" })).status).toBe(404);
    for (const body of [{}, { decision: "REMOVE" }, { decision: "DISMISS", note: "fine" }]) {
      expect((await client.patch(`/api/admin/reports/${report.id}`, body)).status).toBe(400);
    }
    expect(
      (await client.patch(`/api/admin/reports/${report.id}`, { decision: "DISMISS" }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect((await db.report.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("OPEN");
  });
});
