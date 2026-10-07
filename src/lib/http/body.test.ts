import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MAX_BODY_BYTES, readBodyText } from "./body";
import { parseBody } from "./validate";

const schema = z.object({ note: z.string() });

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/example", { method: "POST", body, headers });

function streamOf(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("readBodyText", () => {
  it("reads a small body", async () => {
    expect(await readBodyText(post(JSON.stringify({ note: "hi" })))).toBe('{"note":"hi"}');
  });

  it("reads an empty body as an empty string", async () => {
    expect(await readBodyText(post(null))).toBe("");
  });

  it("accepts a body of exactly the limit", async () => {
    const text = "x".repeat(MAX_BODY_BYTES);

    expect(await readBodyText(post(text))).toHaveLength(MAX_BODY_BYTES);
  });

  it("refuses a body one byte over the limit", async () => {
    await expect(readBodyText(post("x".repeat(MAX_BODY_BYTES + 1)))).rejects.toMatchObject({ status: 413 });
  });

  it("refuses by the declared length without reading the body", async () => {
    const request = post(JSON.stringify({ note: "hi" }), { "content-length": String(MAX_BODY_BYTES + 1) });

    await expect(readBodyText(request)).rejects.toMatchObject({ status: 413, message: "The request body is too large." });
  });

  it("refuses a streamed body that outgrows the limit even when no length was declared", async () => {
    const chunk = new Uint8Array(MAX_BODY_BYTES / 2 + 1);
    const request = new Request("http://localhost:3000/api/example", {
      method: "POST",
      body: streamOf([chunk, chunk, chunk]),
      duplex: "half",
    } as RequestInit);

    await expect(readBodyText(request)).rejects.toMatchObject({ status: 413 });
  });

  it("reads multi-byte text correctly across chunks", async () => {
    const bytes = new TextEncoder().encode("héllo wörld ✓");
    const request = new Request("http://localhost:3000/api/example", {
      method: "POST",
      body: streamOf([bytes.slice(0, 2), bytes.slice(2)]),
      duplex: "half",
    } as RequestInit);

    expect(await readBodyText(request)).toBe("héllo wörld ✓");
  });
});

describe("parseBody", () => {
  it("parses and validates a small json body", async () => {
    expect(await parseBody(post(JSON.stringify({ note: "hi" })), schema)).toEqual({ note: "hi" });
  });

  it.each([
    ["an empty body", null],
    ["text that is not json", "not json"],
    ["json of the wrong shape", JSON.stringify({ note: 1 })],
  ])("answers 400 for %s", async (_label, body) => {
    await expect(parseBody(post(body), schema)).rejects.toMatchObject({ status: 400 });
  });

  it("answers 413 for an oversized body before looking at it", async () => {
    await expect(parseBody(post(JSON.stringify({ note: "x".repeat(MAX_BODY_BYTES) })), schema)).rejects.toMatchObject({
      status: 413,
    });
  });
});
