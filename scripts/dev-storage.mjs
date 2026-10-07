import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 30 * 1024 * 1024;
const KEY = /^\/[A-Za-z0-9_-]+\/(?:item|claim|kyc)\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "ETag",
  "access-control-max-age": "3600",
};

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createStorageServer(root) {
  return createServer(async (request, response) => {
    const send = (status, headers = {}, body) => {
      response.writeHead(status, { ...CORS, ...headers });
      response.end(body);
    };
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "OPTIONS") return send(204);

    const match = KEY.exec(pathname);
    if (!match) return send(404, { "content-type": "text/plain" }, "Not found");
    const file = path.join(root, pathname);

    try {
      if (request.method === "PUT") {
        const body = await readBody(request);
        if (!body) return send(413, { "content-type": "text/plain" }, "Too large");
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, body);
        return send(200, { etag: `"${body.length}"` });
      }
      if (request.method === "GET" || request.method === "HEAD") {
        const body = await readFile(file);
        return send(200, { "content-type": TYPES[match[1]], "content-length": body.length }, request.method === "GET" ? body : undefined);
      }
      return send(405, { "content-type": "text/plain" }, "Method not allowed");
    } catch (error) {
      if (error.code === "ENOENT") return send(404, { "content-type": "text/plain" }, "Not found");
      return send(500, { "content-type": "text/plain" }, "Storage error");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.LOCAL_STORAGE_PORT ?? 9100);
  const root = path.resolve(process.env.LOCAL_STORAGE_DIR ?? ".local-storage");
  createStorageServer(root).listen(port, "127.0.0.1", () => {
    console.log(`Local storage on http://localhost:${port}, files in ${root}`);
  });
}
