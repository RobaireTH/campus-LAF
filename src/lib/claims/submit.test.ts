import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";

import { claimRequestSchema } from "./schema";
import { submitClaim } from "./submit";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  item: { findUnique: vi.fn() },
  claim: { findFirst: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db }));

const claimant: CurrentUser = {
  id: "user_claimant",
  name: "Ada",
  email: "ada@example.com",
  phone: "+2348012345678",
  image: null,
  role: "STUDENT",
  kycStatus: "VERIFIED",
};
const photoKey = "claim/user_claimant/0b9c1e2a-5f4d-4c3b-9a8e-7d6f5e4c3b2a.jpg";
const videoKey = "claim/user_claimant/1c0d2f3b-6a5e-4d4c-8b9f-8e7a6f5d4c3b.mp4";
const input = (overrides: Partial<{ description: string; mediaKeys: string[] }> = {}) =>
  claimRequestSchema.parse({ description: "Black strap, my initials AO on the zip", ...overrides });

beforeEach(() => {
  vi.resetAllMocks();
  db.item.findUnique.mockResolvedValue({ posterId: "user_poster", status: "OPEN" });
  db.claim.findFirst.mockResolvedValue(null);
  db.claim.create.mockResolvedValue({ id: "clm_1", createdAt: new Date("2026-10-03T12:00:00Z") });
});

describe("submitClaim", () => {
  it("creates a pending claim with ordered media", async () => {
    const result = await submitClaim("itm_1", claimant, input({ mediaKeys: [photoKey, videoKey] }));

    expect(result).toEqual({ ok: true, claim: { id: "clm_1", status: "PENDING", createdAt: "2026-10-03T12:00:00.000Z" } });
    expect(db.claim.create).toHaveBeenCalledWith({
      data: {
        itemId: "itm_1",
        claimantId: "user_claimant",
        proofText: "Black strap, my initials AO on the zip",
        media: {
          create: [
            { key: photoKey, position: 0, type: "IMAGE" },
            { key: videoKey, position: 1, type: "VIDEO" },
          ],
        },
      },
      select: { id: true, createdAt: true },
    });
  });

  it("returns 404 when the item does not exist", async () => {
    db.item.findUnique.mockResolvedValue(null);
    expect(await submitClaim("itm_missing", claimant, input())).toMatchObject({ ok: false, status: 404 });
  });

  it("returns 404 when the item was removed", async () => {
    db.item.findUnique.mockResolvedValue({ posterId: "user_poster", status: "REMOVED" });
    expect(await submitClaim("itm_1", claimant, input())).toMatchObject({ ok: false, status: 404 });
  });

  it("rejects claiming your own item", async () => {
    db.item.findUnique.mockResolvedValue({ posterId: "user_claimant", status: "OPEN" });
    expect(await submitClaim("itm_1", claimant, input())).toMatchObject({ ok: false, status: 403 });
    expect(db.claim.create).not.toHaveBeenCalled();
  });

  it.each(["CLAIMED", "RESOLVED"])("rejects items that are %s", async (status) => {
    db.item.findUnique.mockResolvedValue({ posterId: "user_poster", status });
    expect(await submitClaim("itm_1", claimant, input())).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects a second pending claim on the same item", async () => {
    db.claim.findFirst.mockResolvedValue({ id: "clm_existing" });
    expect(await submitClaim("itm_1", claimant, input())).toMatchObject({ ok: false, status: 409 });
    expect(db.claim.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the database unique index catches a race", async () => {
    db.claim.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "7.10.0" }),
    );
    expect(await submitClaim("itm_1", claimant, input())).toMatchObject({ ok: false, status: 409 });
  });

  it.each([
    ["another user's upload", "claim/user_other/0b9c1e2a-5f4d-4c3b-9a8e-7d6f5e4c3b2a.jpg"],
    ["an item upload", "item/user_claimant/0b9c1e2a-5f4d-4c3b-9a8e-7d6f5e4c3b2a.jpg"],
    ["a malformed key", "../../secret.png"],
  ])("rejects %s as proof", async (_label, key) => {
    expect(await submitClaim("itm_1", claimant, input({ mediaKeys: [key] }))).toMatchObject({ ok: false, status: 400 });
    expect(db.item.findUnique).not.toHaveBeenCalled();
  });
});

describe("claimRequestSchema", () => {
  it("trims the description and defaults media to empty", () => {
    expect(claimRequestSchema.parse({ description: "   Blue bottle with a dent   " })).toEqual({
      description: "Blue bottle with a dent",
      mediaKeys: [],
    });
  });

  it.each([
    ["a short description", { description: "mine" }],
    ["more than five files", { description: "Blue bottle with a dent", mediaKeys: ["a", "b", "c", "d", "e", "f"] }],
    ["the same file twice", { description: "Blue bottle with a dent", mediaKeys: [photoKey, photoKey] }],
  ])("rejects %s", (_label, body) => {
    expect(claimRequestSchema.safeParse(body).success).toBe(false);
  });
});
