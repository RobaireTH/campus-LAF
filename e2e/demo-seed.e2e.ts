import { afterAll, describe, expect, it } from "vitest";

import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { mediaKind, ownsUpload } from "@/lib/uploads/keys";

import { DEMO_CLAIMS, DEMO_ITEMS, DEMO_REPORTS, DEMO_USERS } from "../prisma/demo-data";
import { removeDemo, seedDemo } from "../prisma/demo-seed-data";

import { ApiClient } from "./support/client";
import { createAdmin, createUser, signInAs } from "./support/factories";

const PASSWORD = "demo-password-for-tests";
const stored = new Set<string>();

async function plant() {
  const admin = await createUser({ role: "ADMIN", kycStatus: "VERIFIED" });
  return seedDemo(db, {
    password: PASSWORD,
    adminId: admin.id,
    putObject: async (key) => {
      stored.add(key);
    },
  });
}

const demoUser = (id: string) => ({ id });

afterAll(async () => {
  await removeDemo(db);
});

describe("the demo data", () => {
  it("creates the accounts, posts, photos, claims and reports it describes", async () => {
    const summary = await plant();

    expect(summary).toMatchObject({
      users: DEMO_USERS.length,
      items: DEMO_ITEMS.length,
      claims: DEMO_CLAIMS.length,
      reports: DEMO_REPORTS.length,
    });
    expect(await db.user.count({ where: { id: { in: DEMO_USERS.map((user) => user.id) } } })).toBe(DEMO_USERS.length);
    expect(await db.item.count({ where: { id: { in: DEMO_ITEMS.map((item) => item.id) } } })).toBe(DEMO_ITEMS.length);
    expect(await db.claim.count({ where: { id: { in: DEMO_CLAIMS.map((claim) => claim.id) } } })).toBe(DEMO_CLAIMS.length);
    expect(await db.report.count({ where: { id: { in: DEMO_REPORTS.map((report) => report.id) } } })).toBe(DEMO_REPORTS.length);
  });

  it("gives every account the shared password", async () => {
    await plant();

    for (const user of DEMO_USERS) {
      const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await verifyPassword(PASSWORD, row.password), user.email).toBe(true);
    }
  });

  it("stores every photo under a key the upload rules accept and its owner owns", async () => {
    await plant();

    const itemMedia = await db.itemMedia.findMany({ where: { itemId: { in: DEMO_ITEMS.map((item) => item.id) } }, include: { item: true } });
    const claimMedia = await db.claimMedia.findMany({ where: { claimId: { in: DEMO_CLAIMS.map((claim) => claim.id) } }, include: { claim: true } });
    const pending = await db.user.findMany({ where: { id: { in: DEMO_USERS.map((user) => user.id) }, kycIdImageKey: { not: null } } });

    expect(itemMedia.length).toBeGreaterThan(20);
    for (const media of itemMedia) {
      expect(ownsUpload(media.key, media.item.posterId, "item"), media.key).toBe(true);
      expect(mediaKind(media.key)).toBe("IMAGE");
      expect(stored.has(media.key), media.key).toBe(true);
    }
    for (const media of claimMedia) {
      expect(ownsUpload(media.key, media.claim.claimantId, "claim"), media.key).toBe(true);
      expect(stored.has(media.key), media.key).toBe(true);
    }
    for (const user of pending) {
      expect(ownsUpload(user.kycIdImageKey as string, user.id, "kyc"), user.id).toBe(true);
      expect(stored.has(user.kycIdImageKey as string), user.id).toBe(true);
    }
  });

  it("can run again without duplicating anything, and puts back what a presenter changed", async () => {
    await plant();
    await db.item.update({ where: { id: "demo-item-laptop" }, data: { status: "REMOVED", title: "Edited during the demo" } });
    await db.claim.delete({ where: { id: "demo-claim-rucksack-emeka" } });
    await db.report.updateMany({ where: { itemId: "demo-item-spam" }, data: { status: "DISMISSED", decidedAt: new Date() } });

    await plant();

    expect(await db.item.count({ where: { id: { in: DEMO_ITEMS.map((item) => item.id) } } })).toBe(DEMO_ITEMS.length);
    expect(await db.claim.count({ where: { id: { in: DEMO_CLAIMS.map((claim) => claim.id) } } })).toBe(DEMO_CLAIMS.length);
    expect(await db.itemMedia.count({ where: { itemId: { in: DEMO_ITEMS.map((item) => item.id) } } })).toBe(
      DEMO_ITEMS.reduce((total, item) => total + item.photos.length, 0),
    );
    expect(await db.item.findUniqueOrThrow({ where: { id: "demo-item-laptop" } })).toMatchObject({ status: "OPEN", title: "Silver laptop in a grey sleeve" });
    expect(await db.report.count({ where: { itemId: "demo-item-spam", status: "OPEN" } })).toBe(2);
  });

  it("satisfies the database constraints the app relies on", async () => {
    await plant();

    expect(await db.claim.count({ where: { id: { in: DEMO_CLAIMS.map((claim) => claim.id) }, status: "APPROVED", handoverCode: null } })).toBe(0);
    expect(await db.report.count({ where: { id: { in: DEMO_REPORTS.map((report) => report.id) }, status: { not: "OPEN" }, decidedAt: null } })).toBe(0);
  });
});

describe("the demo data through the real API", () => {
  it("shows the poster her posts and the claims waiting on them, with signed proof links", async () => {
    await plant();
    const amaka = await signInAs(demoUser("demo-user-amaka"));

    const posts = await amaka.get<{ items: { id: string; claimCount: number }[] }>("/api/me/items");
    const claims = await amaka.get<{ claims: { claimant: { name: string }; media: { url: string }[] }[] }>("/api/items/demo-item-rucksack/claims");

    expect(posts.body.items.find((item) => item.id === "demo-item-rucksack")?.claimCount).toBe(2);
    expect(claims.body.claims.map((claim) => claim.claimant.name).sort()).toEqual(["Emeka Nwosu", "Tunde Bello"]);
    expect(claims.body.claims.flatMap((claim) => claim.media)).toHaveLength(1);
    expect(claims.body.claims.flatMap((claim) => claim.media)[0].url).toContain("X-Amz-Expires=300");
  });

  it("shows both people of the approved claim the handover, with the code", async () => {
    await plant();
    const claimant = await signInAs(demoUser("demo-user-ngozi"));
    const poster = await signInAs(demoUser("demo-user-amaka"));

    const asClaimant = await claimant.get<{ handover: { status: string; code: string; contact: { name: string } } }>("/api/claims/demo-claim-mini-backpack-ngozi/handover");
    const asPoster = await poster.get<{ handover: { code: string; contact: { name: string } } }>("/api/claims/demo-claim-mini-backpack-ngozi/handover");

    expect(asClaimant.body.handover).toMatchObject({ status: "APPROVED", code: "K7P2XM", contact: { name: "Amaka Obi" } });
    expect(asPoster.body.handover).toMatchObject({ code: "K7P2XM", contact: { name: "Ngozi Eze" } });
  });

  it("fills the admin queues and lists posts with photos publicly", async () => {
    await plant();
    const { client: admin } = await createAdmin();

    const ids = await admin.get<{ verifications: { user: { email: string } }[] }>("/api/admin/verifications");
    const reports = await admin.get<{ reports: { item: { id: string } }[] }>("/api/admin/reports");
    const search = await new ApiClient().get<{ items: { id: string; thumbnailUrl: string | null }[] }>("/api/items?q=rucksack");

    const waiting = ids.body.verifications.map((entry) => entry.user.email);
    expect(waiting).toEqual(expect.arrayContaining(["chidi.okafor@campuslaf.test", "zainab.musa@campuslaf.test"]));
    expect(waiting).not.toContain("tolu.adeyemi@campuslaf.test");
    expect(reports.body.reports.filter((report) => report.item.id === "demo-item-spam")).toHaveLength(2);
    expect(search.body.items.find((item) => item.id === "demo-item-rucksack")?.thumbnailUrl).toContain("X-Amz-Expires=3600");
  });

  it("lets a demo account sign in with the shared password", async () => {
    await plant();
    const client = new ApiClient();

    const result = await client.post<{ user: { email: string } }>("/api/auth/login", { email: "amaka.obi@campuslaf.test", password: PASSWORD });

    expect(result.status).toBe(200);
    expect(result.body.user.email).toBe("amaka.obi@campuslaf.test");
  });
});
