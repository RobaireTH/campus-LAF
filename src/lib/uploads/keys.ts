import { randomUUID } from "node:crypto";

import { UPLOAD_TYPES, type UploadPurpose, type UploadRequest } from "./schema";

const extensions = [...new Set(Object.values(UPLOAD_TYPES).map((type) => type.ext))].join("|");
const KEY_PATTERN = new RegExp(`^(item|claim|kyc)/[A-Za-z0-9_-]+/[0-9a-f-]{36}\\.(${extensions})$`);

export function buildObjectKey(
  purpose: UploadRequest["purpose"],
  userId: string,
  contentType: UploadRequest["contentType"],
) {
  return `${purpose}/${userId}/${randomUUID()}.${UPLOAD_TYPES[contentType].ext}`;
}

export function mediaPurpose(key: string): UploadPurpose {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error("Invalid media key");
  return match[1] as UploadPurpose;
}

export function ownsUpload(key: string, userId: string, purpose: UploadPurpose) {
  const match = KEY_PATTERN.exec(key);
  return match !== null && match[1] === purpose && key.split("/")[1] === userId;
}

export function mediaKind(key: string) {
  const extension = key.slice(key.lastIndexOf(".") + 1);
  return Object.values(UPLOAD_TYPES).find((type) => type.ext === extension)?.kind;
}
