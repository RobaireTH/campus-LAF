import "server-only";

import { createReadUrl } from "./r2";
import { UPLOAD_TYPES, type UploadPurpose } from "./schema";

const READ_URL_TTL_SECONDS: Record<UploadPurpose, number> = {
  item: 60 * 60,
  claim: 5 * 60,
  kyc: 5 * 60,
};

const extensions = [...new Set(Object.values(UPLOAD_TYPES).map((type) => type.ext))].join("|");
const KEY_PATTERN = new RegExp(`^(item|claim|kyc)/[A-Za-z0-9_-]+/[0-9a-f-]{36}\\.(${extensions})$`);

export function mediaPurpose(key: string): UploadPurpose {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error("Invalid media key");
  return match[1] as UploadPurpose;
}

export async function getMediaUrl(key: string) {
  return createReadUrl(key, READ_URL_TTL_SECONDS[mediaPurpose(key)]);
}
