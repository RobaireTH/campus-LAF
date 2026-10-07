import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import { createClaim, createClaimScenario, createSignedInUser, createUser } from "./support/factories";

interface DecisionBody {
  claim: { id: string; status: string; decidedAt: string };
}

interface ErrorBody {
  error: string;
}

const decide = (client: ApiClient, claimId: string, decision: string) =>
  client.patch<DecisionBody & ErrorBody>(`/api/claims/${claimId}`, { decision });

describe("PATCH /api/claims/:id approving", () => {
  it("approves one claim, claims the item and rejects every competing pending claim", async () => {
    const { posterClient, item, claim } = await createClaimScenario();
    const rival = await createClaim(item.id, (await createUser()).id);
    const earlier = await createClaim(item.id, (await createUser()).id, {
      status: "REJECTED",
      decidedAt: new Date("2026-10-01T10:00:00Z"),
    });
    const cancelled = await createClaim(item.id, (await createUser()).id, {
      status: "CANCELLED",
      decidedAt: new Date("2026-10-01T11:00:00Z"),
    });

    const result = await decide(posterClient, claim.id, "APPROVE");

    expect(result.status).toBe(200);
    expect(result.body.claim).toMatchObject({ id: claim.id, status: "APPROVED" });
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("CLAIMED");
    const approved = await db.claim.findUniqueOrThrow({ where: { id: claim.id } });
    expect(approved).toMatchObject({ status: "APPROVED" });
    expect(approved.handoverCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(approved.decidedAt?.toISOString()).toBe(result.body.claim.decidedAt);
    const rejected = await db.claim.findUniqueOrThrow({ where: { id: rival.id } });
    expect(rejected).toMatchObject({ status: "REJECTED", handoverCode: null });
    expect(rejected.decidedAt).toEqual(approved.decidedAt);
    expect(await db.claim.findUniqueOrThrow({ where: { id: earlier.id } })).toMatchObject({
      status: "REJECTED",
      decidedAt: new Date("2026-10-01T10:00:00Z"),
    });
    expect(await db.claim.findUniqueOrThrow({ where: { id: cancelled.id } })).toMatchObject({
      status: "CANCELLED",
      decidedAt: new Date("2026-10-01T11:00:00Z"),
    });
  });

  it("answers an identical repeat with the same result and keeps the same code", async () => {
    const { posterClient, claim } = await createClaimScenario();
    const first = await decide(posterClient, claim.id, "APPROVE");
    const codeBefore = (await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).handoverCode;

    const repeat = await decide(posterClient, claim.id, "APPROVE");

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).handoverCode).toBe(codeBefore);
  });

  it("lets exactly one of several racing approvals win and rejects the rest", async () => {
    const { posterClient, item, claim } = await createClaimScenario();
    const second = await createClaim(item.id, (await createUser()).id);
    const third = await createClaim(item.id, (await createUser()).id);

    const results = await Promise.all([claim, second, third].map((entry) => decide(posterClient, entry.id, "APPROVE")));

    expect(results.map((result) => result.status).sort()).toEqual([200, 409, 409]);
    const claims = await db.claim.findMany({ where: { itemId: item.id } });
    expect(claims.filter((entry) => entry.status === "APPROVED")).toHaveLength(1);
    expect(claims.filter((entry) => entry.status === "REJECTED")).toHaveLength(2);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("CLAIMED");
  });

  it("settles an approval racing a rejection of the same claim", async () => {
    const { posterClient, item, claim } = await createClaimScenario();

    const results = await Promise.all([decide(posterClient, claim.id, "APPROVE"), decide(posterClient, claim.id, "REJECT")]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await db.claim.findUniqueOrThrow({ where: { id: claim.id } });
    const itemStatus = (await db.item.findUniqueOrThrow({ where: { id: item.id } })).status;
    expect([stored.status, itemStatus]).toEqual(stored.status === "APPROVED" ? ["APPROVED", "CLAIMED"] : ["REJECTED", "OPEN"]);
  });

  it("settles an approval racing the owner removing the post", async () => {
    const { posterClient, item, claim } = await createClaimScenario();

    const results = await Promise.all([decide(posterClient, claim.id, "APPROVE"), posterClient.delete(`/api/items/${item.id}`)]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await db.claim.findUniqueOrThrow({ where: { id: claim.id } });
    const itemStatus = (await db.item.findUniqueOrThrow({ where: { id: item.id } })).status;
    expect([stored.status, itemStatus]).toEqual(stored.status === "APPROVED" ? ["APPROVED", "CLAIMED"] : ["CANCELLED", "REMOVED"]);
  });

  it("requires an approved ID from the poster", async () => {
    const { posterClient, item, claim } = await createClaimScenario({ posterKyc: "NOT_SUBMITTED" });

    const result = await decide(posterClient, claim.id, "APPROVE");

    expect(result.status).toBe(403);
    expect(result.body.error).toBe("Verify your student ID to do this.");
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("PENDING");
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });
});

describe("PATCH /api/claims/:id rejecting", () => {
  it("rejects only that claim and leaves the item open, even for a poster without an approved ID", async () => {
    const { posterClient, item, claim } = await createClaimScenario({ posterKyc: "NOT_SUBMITTED" });
    const other = await createClaim(item.id, (await createUser()).id);

    const result = await decide(posterClient, claim.id, "REJECT");

    expect(result.status).toBe(200);
    expect(result.body.claim).toMatchObject({ id: claim.id, status: "REJECTED" });
    expect(result.body.claim.decidedAt).toBeTruthy();
    expect((await db.claim.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("PENDING");
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it("answers an identical repeat with the same result", async () => {
    const { posterClient, claim } = await createClaimScenario();
    const first = await decide(posterClient, claim.id, "REJECT");

    const repeat = await decide(posterClient, claim.id, "REJECT");

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
  });

  it("can still reject a stray pending claim on an item that is already claimed", async () => {
    const { posterClient, item, claim } = await createClaimScenario();
    await decide(posterClient, claim.id, "APPROVE");
    const stray = await createClaim(item.id, (await createUser()).id);

    expect((await decide(posterClient, stray.id, "APPROVE")).status).toBe(409);
    expect((await decide(posterClient, stray.id, "REJECT")).status).toBe(200);
  });
});

describe("PATCH /api/claims/:id conflicts", () => {
  it.each([
    ["approve", "REJECTED", "APPROVE", "already rejected"],
    ["approve", "CANCELLED", "APPROVE", "already cancelled"],
    ["reject", "APPROVED", "REJECT", "already approved"],
    ["reject", "CANCELLED", "REJECT", "already cancelled"],
  ] as const)("refuses to %s a %s claim", async (_verb, status, decision, message) => {
    const { posterClient, claim } = await createClaimScenario();
    await db.claim.update({ where: { id: claim.id }, data: { status, decidedAt: new Date() } });

    const result = await decide(posterClient, claim.id, decision);

    expect(result.status).toBe(409);
    expect(result.body.error).toContain(message);
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe(status);
  });

  it("refuses to approve when the item is no longer open for claims", async () => {
    const { posterClient, claim, item } = await createClaimScenario({ itemStatus: "CLAIMED" });

    const result = await decide(posterClient, claim.id, "APPROVE");

    expect(result.status).toBe(409);
    expect(result.body.error).toBe("This item is no longer open for claims.");
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("PENDING");
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("CLAIMED");
  });

  it("closes the claims when the post is removed, so they can no longer be approved", async () => {
    const { posterClient, item, claim } = await createClaimScenario();
    await posterClient.delete(`/api/items/${item.id}`);

    const result = await decide(posterClient, claim.id, "APPROVE");

    expect(result.status).toBe(409);
    expect(result.body.error).toContain("already cancelled");
  });
});

describe("PATCH /api/claims/:id authorization and input", () => {
  it("is limited to the poster", async () => {
    const { claimantClient, claim } = await createClaimScenario();
    const { client: stranger } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: admin } = await createSignedInUser({ role: "ADMIN", kycStatus: "VERIFIED" });

    for (const client of [claimantClient, stranger, admin]) {
      for (const decision of ["APPROVE", "REJECT"]) {
        const result = await decide(client, claim.id, decision);
        expect(result.status).toBe(403);
        expect(result.body.error).toBe("Only the poster can decide on claims.");
      }
    }
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("PENDING");
  });

  it("rejects signed-out requests, unknown claims and foreign origins", async () => {
    const { posterClient, claim } = await createClaimScenario();

    expect((await decide(new ApiClient(), claim.id, "REJECT")).status).toBe(401);
    expect((await decide(posterClient, "does-not-exist", "REJECT")).status).toBe(404);
    expect(
      (await posterClient.patch(`/api/claims/${claim.id}`, { decision: "REJECT" }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("PENDING");
  });

  it.each([
    ["a missing decision", {}],
    ["lower case", { decision: "approve" }],
    ["an unknown decision", { decision: "ACCEPT" }],
    ["an extra field", { decision: "APPROVE", status: "APPROVED" }],
  ])("rejects %s", async (_label, body) => {
    const { posterClient, claim } = await createClaimScenario();

    const result = await posterClient.patch<ErrorBody>(`/api/claims/${claim.id}`, body);

    expect(result.status).toBe(400);
    expect((await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("PENDING");
  });
});
