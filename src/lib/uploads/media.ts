import "server-only";

import { mediaPurpose } from "./keys";
import { createReadUrl } from "./r2";
import type { UploadPurpose } from "./schema";

const READ_URL_TTL_SECONDS: Record<UploadPurpose, number> = {
  item: 60 * 60,
  claim: 5 * 60,
  kyc: 5 * 60,
};

export async function getMediaUrl(key: string) {
  return createReadUrl(key, READ_URL_TTL_SECONDS[mediaPurpose(key)]);
}
