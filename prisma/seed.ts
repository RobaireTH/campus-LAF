import "dotenv/config";

import { db } from "../src/lib/db";
import { seedAdmin, seedSampleItems, seedTaxonomy } from "./seed-data";

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is not set in .env — add it before seeding.");
  }

  console.log("Seeding categories and locations...");
  const taxonomy = await seedTaxonomy(db);

  console.log("Seeding admin user...");
  const admin = await seedAdmin(db, adminPassword);

  console.log("Seeding sample items...");
  await seedSampleItems(db, admin.id, taxonomy);

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
