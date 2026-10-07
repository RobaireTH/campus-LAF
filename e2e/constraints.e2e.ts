import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createClaim, createItem, createUser } from "./support/factories";

describe("database constraints", () => {
  it("refuse an approved claim without a handover code", async () => {
    const item = await createItem((await createUser()).id);
    const claimant = await createUser();

    await expect(
      db.claim.create({ data: { itemId: item.id, claimantId: claimant.id, proofText: "Initials inside.", status: "APPROVED" } }),
    ).rejects.toThrow(/constraint/i);

    const approved = await createClaim(item.id, claimant.id, { status: "APPROVED", handoverCode: "ABC234" });
    expect(approved.status).toBe("APPROVED");
  });

  it("let a claim that was never approved go without a code", async () => {
    const item = await createItem((await createUser()).id);

    for (const status of ["PENDING", "REJECTED", "CANCELLED"] as const) {
      const claim = await createClaim(item.id, (await createUser()).id, { status });
      expect(claim.handoverCode).toBeNull();
    }
  });

  it("refuse a decided report without a decision time", async () => {
    const item = await createItem((await createUser()).id);
    const reporter = await createUser();

    for (const status of ["DISMISSED", "ACTIONED"] as const) {
      await expect(
        db.report.create({ data: { itemId: item.id, reporterId: (await createUser()).id, reason: "spam", status } }),
      ).rejects.toThrow(/constraint/i);
    }

    const open = await db.report.create({ data: { itemId: item.id, reporterId: reporter.id, reason: "spam" } });
    expect(open.status).toBe("OPEN");
    const dismissed = await db.report.create({
      data: { itemId: item.id, reporterId: (await createUser()).id, reason: "spam", status: "DISMISSED", decidedAt: new Date() },
    });
    expect(dismissed.status).toBe("DISMISSED");
  });

  it("allow only one approved claim per item", async () => {
    const item = await createItem((await createUser()).id);
    await createClaim(item.id, (await createUser()).id, { status: "APPROVED", handoverCode: "ABC234" });

    await expect(
      createClaim(item.id, (await createUser()).id, { status: "APPROVED", handoverCode: "XYZ789" }),
    ).rejects.toThrow();
  });

  it("allow only one pending claim per person per item", async () => {
    const item = await createItem((await createUser()).id);
    const claimant = await createUser();
    await createClaim(item.id, claimant.id);

    await expect(createClaim(item.id, claimant.id)).rejects.toThrow();
    await expect(createClaim(item.id, claimant.id, { status: "REJECTED" })).resolves.toMatchObject({ status: "REJECTED" });
  });

  it("allow only one report per person per post", async () => {
    const item = await createItem((await createUser()).id);
    const reporter = await createUser();
    await db.report.create({ data: { itemId: item.id, reporterId: reporter.id, reason: "spam" } });

    await expect(db.report.create({ data: { itemId: item.id, reporterId: reporter.id, reason: "fake" } })).rejects.toThrow();
  });
});
