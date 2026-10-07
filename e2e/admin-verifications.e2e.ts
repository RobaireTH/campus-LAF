import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import {
  createAdmin,
  createItem,
  createPendingVerification,
  createSignedInUser,
  createUser,
} from "./support/factories";

interface QueueEntry {
  id: string;
  submittedAt: string;
  documentUrl: string;
  user: { id: string; name: string; email: string };
}

interface VerificationBody {
  verification: { id: string; status: string; reviewedAt: string | null; reason: string | null };
}

interface ErrorBody {
  error: string;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const DEFAULT_REASON = "The photo could not be verified. Upload a clearer photo of your school ID.";

describe("GET /api/admin/verifications", () => {
  it("lists pending submissions oldest first with a short-lived link to the ID photo", async () => {
    const { client } = await createAdmin();
    const newest = await createPendingVerification(minutesAgo(1));
    const oldest = await createPendingVerification(minutesAgo(30));
    const middle = await createPendingVerification(minutesAgo(10));
    const { user: verified } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { user: rejected } = await createSignedInUser({ kycStatus: "REJECTED" });
    const { user: never } = await createSignedInUser();
    const ours = [oldest.user.id, middle.user.id, newest.user.id];

    const result = await client.get<{ verifications: QueueEntry[] }>("/api/admin/verifications");

    expect(result.status).toBe(200);
    const queue = result.body.verifications.filter((entry) => ours.includes(entry.id));
    expect(queue.map((entry) => entry.id)).toEqual(ours);
    expect(queue[0]).toMatchObject({ user: { id: oldest.user.id, email: oldest.user.email } });
    expect(Object.keys(queue[0]).sort()).toEqual(["documentUrl", "id", "submittedAt", "user"]);
    expect(queue[0].documentUrl).toContain(oldest.key);
    expect(queue[0].documentUrl).toContain("X-Amz-Expires=300");
    const text = JSON.stringify(result.body);
    for (const other of [verified.id, rejected.id, never.id]) expect(text).not.toContain(other);
    expect(text).not.toContain("password");
  });

  it("is for admins only", async () => {
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const forbidden = await student.get<ErrorBody>("/api/admin/verifications");

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe("Administrator access is required.");
    expect((await new ApiClient().get("/api/admin/verifications")).status).toBe(401);
  });
});

describe("PATCH /api/admin/verifications/:id approving", () => {
  it("verifies the user, records who decided and when, and unlocks claiming", async () => {
    const { user: admin, client } = await createAdmin();
    const { user, client: userClient } = await createPendingVerification();
    await db.user.update({ where: { id: user.id }, data: { kycRejectionReason: "An old reason" } });
    const item = await createItem((await createUser()).id);
    expect(
      (await userClient.post(`/api/items/${item.id}/claims`, { description: "Black strap, my initials AO inside" })).status,
    ).toBe(403);

    const result = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" });

    expect(result.status).toBe(200);
    expect(result.body.verification).toMatchObject({ id: user.id, status: "VERIFIED", reason: null });
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ kycStatus: "VERIFIED", kycRejectionReason: null, kycReviewedById: admin.id });
    expect(stored.kycReviewedAt?.toISOString()).toBe(result.body.verification.reviewedAt);
    expect(
      (await userClient.post(`/api/items/${item.id}/claims`, { description: "Black strap, my initials AO inside" })).status,
    ).toBe(201);
  });

  it("answers an identical repeat with the same result", async () => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();
    const first = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" });

    const repeat = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" });

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
  });
});

describe("PATCH /api/admin/verifications/:id rejecting", () => {
  it("rejects with the admin's note, which the user then sees and can fix by resubmitting", async () => {
    const { client } = await createAdmin();
    const { user, client: userClient } = await createPendingVerification();

    const result = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, {
      decision: "REJECT",
      reason: "  The name on the card is not readable.  ",
    });

    expect(result.status).toBe(200);
    expect(result.body.verification).toMatchObject({ status: "REJECTED", reason: "The name on the card is not readable." });
    const me = await userClient.get<{ user: { kycStatus: string; kycRejectionReason: string } }>("/api/me");
    expect(me.body.user).toMatchObject({ kycStatus: "REJECTED", kycRejectionReason: "The name on the card is not readable." });

    const resubmitted = await userClient.post("/api/me/verification", { key: buildObjectKey("kyc", user.id, "image/png") });
    expect(resubmitted.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycRejectionReason).toBeNull();
  });

  it.each([
    ["no note", { decision: "REJECT" }],
    ["a blank note", { decision: "REJECT", reason: "   " }],
  ])("uses the default message for %s", async (_label, body) => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();

    const result = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, body);

    expect(result.body.verification.reason).toBe(DEFAULT_REASON);
  });

  it("keeps the first reason when the rejection is repeated", async () => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();
    await client.patch(`/api/admin/verifications/${user.id}`, { decision: "REJECT", reason: "First reason" });

    const repeat = await client.patch<VerificationBody>(`/api/admin/verifications/${user.id}`, {
      decision: "REJECT",
      reason: "A different reason",
    });

    expect(repeat.status).toBe(200);
    expect(repeat.body.verification.reason).toBe("First reason");
  });
});

describe("PATCH /api/admin/verifications/:id conflicts and limits", () => {
  it.each([
    ["approve", "REJECTED", "already rejected"],
    ["reject", "VERIFIED", "already verified"],
    ["approve", "NOT_SUBMITTED", "has not submitted"],
    ["reject", "NOT_SUBMITTED", "has not submitted"],
  ] as const)("refuses to %s a user whose status is %s", async (verb, status, message) => {
    const { client } = await createAdmin();
    const { user } = await createSignedInUser({ kycStatus: status });

    const result = await client.patch<ErrorBody>(`/api/admin/verifications/${user.id}`, {
      decision: verb === "approve" ? "APPROVE" : "REJECT",
    });

    expect(result.status).toBe(409);
    expect(result.body.error).toContain(message);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe(status);
  });

  it("settles an approval racing a rejection", async () => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();

    const results = await Promise.all([
      client.patch(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" }),
      client.patch(`/api/admin/verifications/${user.id}`, { decision: "REJECT" }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(["VERIFIED", "REJECTED"]).toContain((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus);
  });

  it("does not let an admin review their own ID", async () => {
    const { user, client } = await createSignedInUser({ role: "ADMIN", kycStatus: "PENDING" });

    const result = await client.patch<ErrorBody>(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" });

    expect(result.status).toBe(403);
    expect(result.body.error).toBe("You can't review your own ID.");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("PENDING");
  });

  it("answers 404 for an unknown user", async () => {
    const { client } = await createAdmin();

    expect((await client.patch("/api/admin/verifications/does-not-exist", { decision: "APPROVE" })).status).toBe(404);
  });

  it("is for admins only", async () => {
    const { user } = await createPendingVerification();
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });

    for (const decision of ["APPROVE", "REJECT"]) {
      expect((await student.patch(`/api/admin/verifications/${user.id}`, { decision })).status).toBe(403);
    }
    expect((await new ApiClient().patch(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" })).status).toBe(401);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("PENDING");
  });

  it.each([
    ["a missing decision", {}],
    ["an unknown decision", { decision: "ACCEPT" }],
    ["a note on an approval", { decision: "APPROVE", reason: "Looks good" }],
    ["a very long note", { decision: "REJECT", reason: "x".repeat(201) }],
    ["an extra field", { decision: "APPROVE", status: "VERIFIED" }],
  ])("rejects %s", async (_label, body) => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();

    expect((await client.patch<ErrorBody>(`/api/admin/verifications/${user.id}`, body)).status).toBe(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("PENDING");
  });

  it("blocks a foreign Origin", async () => {
    const { client } = await createAdmin();
    const { user } = await createPendingVerification();

    const result = await client.patch(`/api/admin/verifications/${user.id}`, { decision: "APPROVE" }, { origin: "https://evil.example" });

    expect(result.status).toBe(403);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycStatus).toBe("PENDING");
  });
});
