import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { mediaKind, ownsUpload } from "../src/lib/uploads/keys";
import { DEMO_CLAIMS, DEMO_ITEMS, DEMO_REPORTS, DEMO_USERS } from "./demo-data";
import { demoKey } from "./demo-seed-data";

const IMAGES = path.join(process.cwd(), "prisma/demo/images");
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const userIds = new Set(DEMO_USERS.map((user) => user.id));
const itemById = new Map(DEMO_ITEMS.map((item) => [item.id, item]));

const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

describe("demo data", () => {
  it("uses unique ids, emails and phone numbers", () => {
    expect(duplicates(DEMO_USERS.map((user) => user.id))).toEqual([]);
    expect(duplicates(DEMO_USERS.map((user) => user.email))).toEqual([]);
    expect(duplicates(DEMO_USERS.map((user) => user.phone))).toEqual([]);
    expect(duplicates(DEMO_ITEMS.map((item) => item.id))).toEqual([]);
    expect(duplicates(DEMO_CLAIMS.map((claim) => claim.id))).toEqual([]);
    expect(duplicates(DEMO_REPORTS.map((report) => report.id))).toEqual([]);
  });

  it("has a photo file for everything that points at one", () => {
    const photos = [
      ...DEMO_ITEMS.flatMap((item) => item.photos),
      ...DEMO_CLAIMS.flatMap((claim) => claim.photos),
      ...DEMO_USERS.flatMap((user) => (user.idPhoto ? [user.idPhoto] : [])),
    ];

    expect(photos.length).toBeGreaterThan(20);
    for (const photo of photos) expect(existsSync(path.join(IMAGES, `${photo}.jpg`)), photo).toBe(true);
  });

  it("only refers to people and posts that exist", () => {
    for (const item of DEMO_ITEMS) expect(userIds.has(item.poster), item.id).toBe(true);
    for (const claim of DEMO_CLAIMS) {
      expect(userIds.has(claim.claimant), claim.id).toBe(true);
      expect(itemById.has(claim.item), claim.id).toBe(true);
    }
    for (const report of DEMO_REPORTS) {
      expect(userIds.has(report.reporter), report.id).toBe(true);
      expect(itemById.has(report.item), report.id).toBe(true);
    }
  });

  it("keeps posts, claims and reports consistent with the app's rules", () => {
    for (const item of DEMO_ITEMS) {
      const claims = DEMO_CLAIMS.filter((claim) => claim.item === item.id);
      const approved = claims.filter((claim) => claim.status === "APPROVED");
      const pending = claims.filter((claim) => claim.status === "PENDING");

      expect(approved.length, `${item.id} approved claims`).toBeLessThanOrEqual(1);
      if (item.status === "CLAIMED" || item.status === "RESOLVED") expect(approved, item.id).toHaveLength(1);
      if (item.status !== "OPEN") expect(pending, item.id).toHaveLength(0);
      if (item.status === "OPEN") expect(approved, item.id).toHaveLength(0);
      for (const claim of claims) expect(claim.claimant, claim.id).not.toBe(item.poster);
    }
    for (const claim of DEMO_CLAIMS) {
      if (claim.status === "APPROVED") expect(claim.handoverCode, claim.id).toMatch(CODE);
      else expect(claim.handoverCode, claim.id).toBeUndefined();
    }
    const pairs = DEMO_CLAIMS.filter((claim) => claim.status === "PENDING").map((claim) => `${claim.item}:${claim.claimant}`);
    expect(duplicates(pairs)).toEqual([]);
    const reported = DEMO_REPORTS.map((report) => `${report.item}:${report.reporter}`);
    expect(duplicates(reported)).toEqual([]);
    for (const report of DEMO_REPORTS) expect(itemById.get(report.item)?.poster, report.id).not.toBe(report.reporter);
  });

  it("shows the review queues something to do", () => {
    expect(DEMO_USERS.filter((user) => user.kyc === "PENDING").length).toBeGreaterThanOrEqual(2);
    expect(DEMO_USERS.some((user) => user.kyc === "REJECTED" && user.rejectionReason)).toBe(true);
    expect(DEMO_REPORTS.filter((report) => report.status === "OPEN").length).toBeGreaterThanOrEqual(2);
    expect(DEMO_ITEMS.some((item) => item.status === "REMOVED")).toBe(true);
    expect(DEMO_ITEMS.some((item) => item.status === "RESOLVED")).toBe(true);
    expect(DEMO_ITEMS.filter((item) => item.status === "OPEN").length).toBeGreaterThanOrEqual(15);
  });
});

describe("demoKey", () => {
  it("builds keys the upload rules accept, owned by the right person", () => {
    const itemKey = demoKey("item", "demo-user-amaka", "demo-item-rucksack", "rucksack");
    const claimKey = demoKey("claim", "demo-user-tunde", "demo-claim-rucksack-tunde", "receipt-rucksack");
    const idKey = demoKey("kyc", "demo-user-chidi", "demo-user-chidi", "kyc-chidi");

    expect(ownsUpload(itemKey, "demo-user-amaka", "item")).toBe(true);
    expect(ownsUpload(claimKey, "demo-user-tunde", "claim")).toBe(true);
    expect(ownsUpload(idKey, "demo-user-chidi", "kyc")).toBe(true);
    expect(ownsUpload(itemKey, "demo-user-tunde", "item")).toBe(false);
    expect([itemKey, claimKey, idKey].map(mediaKind)).toEqual(["IMAGE", "IMAGE", "IMAGE"]);
  });

  it("is stable for the same inputs and different for different ones", () => {
    const first = demoKey("item", "demo-user-amaka", "demo-item-rucksack", "rucksack");

    expect(demoKey("item", "demo-user-amaka", "demo-item-rucksack", "rucksack")).toBe(first);
    expect(demoKey("item", "demo-user-amaka", "demo-item-rucksack", "rucksack-side")).not.toBe(first);
    expect(demoKey("item", "demo-user-amaka", "demo-item-headphones", "rucksack")).not.toBe(first);
  });
});
