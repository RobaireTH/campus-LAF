import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createReadUrl } from "@/lib/uploads/r2";

import { createSignedInUser } from "./support/factories";
import { TINY_PNG, deleteObject, r2Configured } from "./support/r2";

interface UploadBody {
  uploadUrl: string;
  key: string;
}

describe.skipIf(!r2Configured)("real R2 round trip", () => {
  const storedKeys: string[] = [];

  afterAll(async () => {
    await Promise.all(storedKeys.map((key) => deleteObject(key).catch(() => undefined)));
  });

  async function presignedPng(size = TINY_PNG.length) {
    const { user, client } = await createSignedInUser();
    const result = await client.post<UploadBody>("/api/uploads", { purpose: "kyc", contentType: "image/png", size });
    expect(result.status).toBe(201);
    storedKeys.push(result.body.key);
    return { user, client, ...result.body };
  }

  it("stores an ID photo through the signed URL, accepts it for verification and serves it back through a short-lived link", async () => {
    const { user, client, uploadUrl, key } = await presignedPng();

    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(put.status).toBe(200);

    const submitted = await client.post("/api/me/verification", { key });
    expect(submitted.status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).kycIdImageKey).toBe(key);

    const read = await fetch(await createReadUrl(key, 60));
    expect(read.status).toBe(200);
    expect(Buffer.from(await read.arrayBuffer()).equals(TINY_PNG)).toBe(true);
  });

  it("refuses an upload that is larger than the size that was signed", async () => {
    const { uploadUrl, key } = await presignedPng();

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: Buffer.concat([TINY_PNG, Buffer.from("extra bytes")]),
    });

    expect(put.status).toBeGreaterThanOrEqual(400);
    expect(put.status).toBeLessThan(500);
    expect((await fetch(await createReadUrl(key, 60))).status).toBe(404);
  });

  it("refuses an upload with a different content type than the one that was signed", async () => {
    const { uploadUrl, key } = await presignedPng();

    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "text/html" }, body: TINY_PNG });

    expect(put.status).toBeGreaterThanOrEqual(400);
    expect(put.status).toBeLessThan(500);
    expect((await fetch(await createReadUrl(key, 60))).status).toBe(404);
  });

  it("serves nothing through an unsigned address", async () => {
    const { uploadUrl } = await presignedPng();

    const unsigned = await fetch(uploadUrl.split("?")[0]);

    expect(unsigned.status).toBeGreaterThanOrEqual(400);
  });
});
