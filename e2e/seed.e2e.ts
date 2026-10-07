import { describe, expect, it } from "vitest";

import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

import { ADMIN_EMAIL, seedAdmin, seedSampleItems, seedTaxonomy } from "../prisma/seed-data";

describe("seed", () => {
  it("can run again without duplicating anything or touching the admin's password", async () => {
    const taxonomy = await seedTaxonomy(db);
    const admin = await seedAdmin(db, "first-password-1");
    await seedSampleItems(db, admin.id, taxonomy);
    const sampleItems = await db.item.count({ where: { posterId: admin.id } });

    const taxonomyAgain = await seedTaxonomy(db);
    const adminAgain = await seedAdmin(db, "second-password-2");
    await seedSampleItems(db, adminAgain.id, taxonomyAgain);

    expect(sampleItems).toBeGreaterThan(0);
    expect(taxonomyAgain).toEqual(taxonomy);
    expect(await db.item.count({ where: { posterId: admin.id } })).toBe(sampleItems);
    expect(await db.user.count({ where: { email: ADMIN_EMAIL } })).toBe(1);
    expect(adminAgain.id).toBe(admin.id);
    expect(adminAgain.password).toBe(admin.password);
    expect(await verifyPassword("first-password-1", adminAgain.password)).toBe(true);

    await db.item.deleteMany({ where: { posterId: admin.id } });
  });

  it("replaces the admin's password, role and verified ID only when asked to", async () => {
    const admin = await seedAdmin(db, "first-password-1");
    await db.user.update({ where: { id: admin.id }, data: { role: "STUDENT", kycStatus: "REJECTED" } });

    const untouched = await seedAdmin(db, "second-password-2");
    expect(untouched).toMatchObject({ role: "STUDENT", kycStatus: "REJECTED" });
    expect(await verifyPassword("second-password-2", untouched.password)).toBe(false);

    const reset = await seedAdmin(db, "second-password-2", { resetPassword: true });
    expect(reset).toMatchObject({ id: admin.id, role: "ADMIN", kycStatus: "VERIFIED" });
    expect(await verifyPassword("second-password-2", reset.password)).toBe(true);
    expect(await verifyPassword("first-password-1", reset.password)).toBe(false);
  });
});
