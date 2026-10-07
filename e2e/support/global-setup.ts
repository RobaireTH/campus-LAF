import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import pg from "pg";

import { seedTaxonomy } from "../../prisma/seed-data";
import { connectionConfig, createDbClient } from "../../src/lib/db";
import { DEFAULT_CATEGORY, DEFAULT_LOCATION, E2E_BASE_URL, E2E_PORT, e2eDatabaseUrl, storageEnv } from "./env.mjs";

const root = process.cwd();
const bin = (name: string) => path.join(root, "node_modules", ".bin", name);

function run(command: string, args: string[], env: Record<string, string> = {}) {
  try {
    execFileSync(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: "pipe" });
  } catch (error) {
    const failure = error as { stdout?: Buffer; stderr?: Buffer };
    console.error(String(failure.stdout ?? ""), String(failure.stderr ?? ""));
    throw error;
  }
}

function portInUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function resetSchema(databaseUrl: string) {
  const { connectionString, schema } = connectionConfig(databaseUrl);
  if (!schema) throw new Error("The end-to-end database URL must name a schema.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await client.end();
  }
}

async function seedBaseline(databaseUrl: string) {
  const client = createDbClient(databaseUrl);
  try {
    await seedTaxonomy(client);
    await client.category.create({ data: { name: DEFAULT_CATEGORY } });
    await client.location.create({ data: { name: DEFAULT_LOCATION } });
  } finally {
    await client.$disconnect();
  }
}

function startServer(databaseUrl: string) {
  const logPath = path.join(tmpdir(), "findr-e2e-server.log");
  const log = createWriteStream(logPath);
  const child = spawn(bin("next"), ["start", "--port", String(E2E_PORT)], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseUrl, ...storageEnv() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return { child, logPath };
}

async function waitForServer(child: ChildProcess, logPath: string) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The test server exited early. Log: ${logPath}`);
    const ready = await fetch(`${E2E_BASE_URL}/api/health`).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The test server did not become healthy. Log: ${logPath}`);
}

function stopServer(child: ChildProcess) {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null) return resolve();
    const forceKill = setTimeout(() => child.kill("SIGKILL"), 10_000);
    child.once("exit", () => {
      clearTimeout(forceKill);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

export default async function setup() {
  const databaseUrl = e2eDatabaseUrl();

  if (await portInUse(E2E_PORT)) {
    throw new Error(`Port ${E2E_PORT} is already in use. Stop whatever is listening on it and run the tests again.`);
  }

  await resetSchema(databaseUrl);
  run(bin("prisma"), ["migrate", "deploy"], { DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl });
  await seedBaseline(databaseUrl);

  if (!process.env.E2E_SKIP_BUILD) run(bin("next"), ["build"], { NODE_ENV: "production", ...storageEnv() });

  const { child, logPath } = startServer(databaseUrl);
  try {
    await waitForServer(child, logPath);
  } catch (error) {
    await stopServer(child);
    throw error;
  }

  return () => stopServer(child);
}
