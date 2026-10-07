import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const KEY_ID = "4b62f542c3d83b7532bb63d24c866d2a";

async function loadR2() {
  vi.resetModules();
  return import("./r2");
}

describe("signed storage urls", () => {
  beforeEach(() => {
    vi.stubEnv("R2_ACCOUNT_ID", "acct123\n");
    vi.stubEnv("R2_ACCESS_KEY_ID", `${KEY_ID}\n\n`);
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-value\n");
    vi.stubEnv("R2_BUCKET", " media-bucket \n");
    vi.stubEnv("R2_ENDPOINT", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sign a read url with the settings trimmed", async () => {
    const { createReadUrl } = await loadR2();

    const url = new URL(await createReadUrl("item/user_1/photo.jpg", 60));

    expect(url.hostname).toBe("acct123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/media-bucket/item/user_1/photo.jpg");
    expect(url.searchParams.get("X-Amz-Credential")).toMatch(new RegExp(`^${KEY_ID}/\\d{8}/auto/s3/aws4_request$`));
  });

  it("sign an upload url with the settings trimmed", async () => {
    const { createUploadUrl } = await loadR2();

    const { uploadUrl, key } = await createUploadUrl({ purpose: "item", contentType: "image/jpeg", size: 1000 }, "user_1");

    const url = new URL(uploadUrl);
    expect(url.pathname).toBe(`/media-bucket/${key}`);
    expect(url.searchParams.get("X-Amz-Credential")?.startsWith(`${KEY_ID}/`)).toBe(true);
  });

  it("use a custom endpoint without the stray whitespace around it", async () => {
    vi.stubEnv("R2_ENDPOINT", " http://localhost:9100 \n");
    const { createReadUrl } = await loadR2();

    const url = new URL(await createReadUrl("item/user_1/photo.jpg", 60));

    expect(url.origin).toBe("http://localhost:9100");
  });

  it("still refuse a setting that is only whitespace", async () => {
    vi.stubEnv("R2_ACCESS_KEY_ID", "  \n");
    const { createReadUrl } = await loadR2();

    await expect(createReadUrl("item/user_1/photo.jpg", 60)).rejects.toThrow("R2_ACCESS_KEY_ID is not set");
  });
});
