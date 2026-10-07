import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { STORAGE_VARIABLES } from "./env.mjs";

export const r2Configured = STORAGE_VARIABLES.every((name) => Boolean(process.env[name])) && !process.env.E2E_R2_PLACEHOLDER;

export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let client: S3Client | undefined;

export async function deleteObject(key: string) {
  client ??= new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  });
  await client.send(new DeleteObjectCommand({ Bucket: env("R2_BUCKET"), Key: key }));
}
