import { describe, expect, it } from "vitest";

import { UPLOAD_RATE_LIMIT } from "@/lib/uploads/limits";

import { ApiClient } from "./support/client";
import { createSignedInUser, createUser, signInAs } from "./support/factories";

interface UploadBody {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

const MB = 1024 * 1024;

const presign = (overrides: Record<string, unknown> = {}) => ({
  purpose: "item",
  contentType: "image/jpeg",
  size: 1000,
  ...overrides,
});

describe("POST /api/uploads", () => {
  it("rejects signed-out requests", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/uploads", presign());

    expect(result.status).toBe(401);
  });

  it.each([
    ["item", "image/jpeg", "jpg"],
    ["item", "video/mp4", "mp4"],
    ["claim", "image/png", "png"],
    ["claim", "video/webm", "webm"],
    ["kyc", "image/webp", "webp"],
  ])("signs a %s upload of %s into the user's own folder", async (purpose, contentType, extension) => {
    const { user, client } = await createSignedInUser();

    const result = await client.post<UploadBody>("/api/uploads", presign({ purpose, contentType }));

    expect(result.status).toBe(201);
    expect(result.body.key).toMatch(new RegExp(`^${purpose}/${user.id}/[0-9a-f-]{36}\\.${extension}$`));
    expect(result.body.expiresIn).toBe(300);
    expect(result.body.uploadUrl).toContain("X-Amz-Signature=");
    expect(result.body.uploadUrl).toMatch(/X-Amz-SignedHeaders=[^&]*content-length/);
    expect(result.body.uploadUrl).toMatch(/X-Amz-SignedHeaders=[^&]*content-type/);
  });

  it("gives every upload its own key", async () => {
    const { client } = await createSignedInUser();

    const [first, second] = await Promise.all([
      client.post<UploadBody>("/api/uploads", presign()),
      client.post<UploadBody>("/api/uploads", presign()),
    ]);

    expect(first.body.key).not.toBe(second.body.key);
  });

  it("only accepts photos for ID verification", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/uploads", presign({ purpose: "kyc", contentType: "video/mp4" }));

    expect(result.status).toBe(400);
    expect(result.body.error).toBe("ID verification only accepts photos.");
  });

  it.each([
    ["an image over 5 MB", { contentType: "image/png", size: 5 * MB + 1 }, "5 MB"],
    ["a video over 25 MB", { contentType: "video/mp4", size: 25 * MB + 1 }, "25 MB"],
  ])("rejects %s with the limit in the message", async (_label, overrides, limit) => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/uploads", presign(overrides));

    expect(result.status).toBe(400);
    expect(result.body.error).toContain(limit);
  });

  it.each([
    ["an unsupported file type", { contentType: "application/pdf" }],
    ["a GIF", { contentType: "image/gif" }],
    ["an unknown purpose", { purpose: "avatar" }],
    ["a zero size", { size: 0 }],
    ["a negative size", { size: -5 }],
    ["a fractional size", { size: 1.5 }],
    ["a size that is not a number", { size: "big" }],
  ])("rejects %s", async (_label, overrides) => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/uploads", presign(overrides));

    expect(result.status).toBe(400);
  });

  it("limits how many URLs one user can request, counting concurrent requests exactly", async () => {
    const { client } = await createSignedInUser();
    const { max } = UPLOAD_RATE_LIMIT;

    const allowed = await Promise.all(Array.from({ length: max }, () => client.post("/api/uploads", presign())));
    expect(allowed.map((result) => result.status)).toEqual(Array(max).fill(201));

    const blocked = await client.post<ErrorBody>("/api/uploads", presign());
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("counts the limit per user, so another user on the same network is not affected", async () => {
    const sharedIp = "10.77.0.1";
    const busy = await signInAs(await createUser(), { ip: sharedIp });
    const bystander = await signInAs(await createUser(), { ip: sharedIp });
    await Promise.all(Array.from({ length: UPLOAD_RATE_LIMIT.max }, () => busy.post("/api/uploads", presign())));

    expect((await busy.post("/api/uploads", presign())).status).toBe(429);
    expect((await bystander.post("/api/uploads", presign())).status).toBe(201);
  });

  it("blocks a foreign Origin", async () => {
    const { client } = await createSignedInUser();

    const result = await client.post<ErrorBody>("/api/uploads", presign(), { origin: "https://evil.example" });

    expect(result.status).toBe(403);
  });
});
