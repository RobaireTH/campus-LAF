import "dotenv/config";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { db } from "../src/lib/db";
import { seedDemo } from "./demo-seed-data";
import { ADMIN_EMAIL } from "./seed-data";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function assertLocalDatabase() {
  const host = new URL(requireEnv("DATABASE_URL")).hostname;
  if (!LOCAL_HOSTS.has(host) && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      `Refusing to put demo accounts with a shared password into ${host}. Use the local database (npm run local:setup), or set ALLOW_DEMO_SEED=1 if you really mean it.`,
    );
  }
}

function storageClient() {
  return new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: process.env.R2_ENDPOINT || `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: requireEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY") },
  });
}

async function main() {
  assertLocalDatabase();
  const password = requireEnv("SEED_DEMO_PASSWORD");
  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) throw new Error("The administrator is missing. Run the base seed first: npx prisma db seed");

  const storage = storageClient();
  const bucket = requireEnv("R2_BUCKET");
  const summary = await seedDemo(db, {
    password,
    adminId: admin.id,
    putObject: (key, body, contentType) =>
      storage.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })),
  });

  console.log(
    `Demo data ready: ${summary.users} accounts, ${summary.items} posts with ${summary.photos} photos, ${summary.claims} claims, ${summary.reports} reports, ${summary.uploads} files stored.`,
  );
  console.log("Every demo account signs in with SEED_DEMO_PASSWORD.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
