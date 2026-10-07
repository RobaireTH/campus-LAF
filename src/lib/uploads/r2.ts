import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { buildObjectKey } from "./keys";
import type { UploadRequest, UploadResponse } from "./schema";

const UPLOAD_URL_TTL_SECONDS = 300;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let client: S3Client | undefined;

function r2() {
  client ??= new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export async function createUploadUrl(request: UploadRequest, userId: string): Promise<UploadResponse> {
  const key = buildObjectKey(request.purpose, userId, request.contentType);
  const command = new PutObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
    ContentType: request.contentType,
    ContentLength: request.size,
  });
  const uploadUrl = await getSignedUrl(r2(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
  return { uploadUrl, key, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

export async function createReadUrl(key: string, expiresIn: number) {
  const command = new GetObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key });
  return getSignedUrl(r2(), command, { expiresIn });
}
