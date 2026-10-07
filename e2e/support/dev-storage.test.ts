import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createStorageServer } from "../../scripts/dev-storage.mjs";

const KEY = "/campus-laf-media/item/user_1/0a1b2c3d-1111-4222-8333-444455556666.jpg";
const PHOTO = Buffer.from("not really a jpeg, but bytes are bytes");

let base = "";
let root = "";
let server: ReturnType<typeof createStorageServer>;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "findr-storage-"));
  server = createStorageServer(root);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

describe("local storage server", () => {
  it("stores an upload and serves it back with its type, ignoring the signature in the query", async () => {
    const put = await fetch(`${base}${KEY}?X-Amz-Signature=abc&X-Amz-Expires=300`, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: PHOTO,
    });
    const get = await fetch(`${base}${KEY}?X-Amz-Signature=other`);

    expect(put.status).toBe(200);
    expect(put.headers.get("etag")).toBeTruthy();
    expect(get.status).toBe(200);
    expect(get.headers.get("content-type")).toBe("image/jpeg");
    expect(Buffer.from(await get.arrayBuffer())).toEqual(PHOTO);
  });

  it("answers HEAD with the size and no body", async () => {
    const head = await fetch(`${base}${KEY}`, { method: "HEAD" });

    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe(String(PHOTO.length));
    expect(await head.text()).toBe("");
  });

  it("allows a browser upload from any origin, including the preflight", async () => {
    const preflight = await fetch(`${base}${KEY}`, {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3100", "access-control-request-method": "PUT", "access-control-request-headers": "content-type" },
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("PUT");
    expect(preflight.headers.get("access-control-allow-headers")).toBe("*");
  });

  it("answers 404 for an object that was never stored", async () => {
    const missing = await fetch(`${base}/campus-laf-media/item/user_1/ffffffff-1111-4222-8333-444455556666.jpg`);

    expect(missing.status).toBe(404);
  });

  it.each([
    ["a path that is not an object key", "/anything"],
    ["a path that climbs out of the folder", "/campus-laf-media/item/../../../etc/passwd"],
    ["an unknown purpose", "/campus-laf-media/secret/user_1/0a1b2c3d-1111-4222-8333-444455556666.jpg"],
    ["an unknown file type", "/campus-laf-media/item/user_1/0a1b2c3d-1111-4222-8333-444455556666.exe"],
  ])("refuses to store %s", async (_label, route) => {
    const put = await fetch(`${base}${route}`, { method: "PUT", body: PHOTO });

    expect(put.status).toBe(404);
  });

  it("refuses an upload over the size limit", async () => {
    const big = Buffer.alloc(31 * 1024 * 1024);

    const put = await fetch(`${base}/campus-laf-media/item/user_1/0a1b2c3d-1111-4222-8333-999955556666.mp4`, {
      method: "PUT",
      body: big,
    });

    expect(put.status).toBe(413);
  });

  it("refuses other methods", async () => {
    const post = await fetch(`${base}${KEY}`, { method: "DELETE" });

    expect(post.status).toBe(405);
  });
});
