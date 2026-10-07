import { payloadTooLarge } from "./errors";

export const MAX_BODY_BYTES = 64 * 1024;

export async function readBodyText(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw payloadTooLarge();
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    received += chunk.value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw payloadTooLarge();
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
