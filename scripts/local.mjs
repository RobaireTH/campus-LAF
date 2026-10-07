import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const ENV_FILE = ".env.local";
const NEXT_PORT = process.env.PORT ?? "3100";

function secret() {
  return randomBytes(9).toString("base64url");
}

function ensureEnvFile() {
  if (existsSync(ENV_FILE)) return;
  const cloud = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
  const lines = [
    "DATABASE_URL=postgresql://postgres:postgres@localhost:55433/findr",
    "DIRECT_URL=",
    "E2E_DATABASE_URL=",
    "R2_ENDPOINT=http://localhost:9100",
    "R2_ACCOUNT_ID=local",
    "R2_ACCESS_KEY_ID=local",
    "R2_SECRET_ACCESS_KEY=local",
    "R2_BUCKET=campus-laf-media",
    `SEED_ADMIN_PASSWORD=${cloud.SEED_ADMIN_PASSWORD || secret()}`,
    `SEED_DEMO_PASSWORD=${secret()}`,
    "",
  ];
  writeFileSync(ENV_FILE, lines.join("\n"), { mode: 0o600 });
  console.log(`Created ${ENV_FILE} with a local database, local storage and generated passwords. Open it to read or change them.`);
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`\n"${[command, ...args].join(" ")}" failed.`);
    process.exit(result.status ?? 1);
  }
}

function startDatabase() {
  run("docker", ["compose", "up", "-d", "--wait", "db"]);
}

function startStorage() {
  return spawn(process.execPath, ["scripts/dev-storage.mjs"], { stdio: "inherit", env: process.env });
}

function storageIsRunning() {
  return fetch(process.env.R2_ENDPOINT, { method: "OPTIONS" }).then(() => true, () => false);
}

async function waitForStorage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await storageIsRunning()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The local storage server did not start.");
}

async function seedDemo() {
  const storage = (await storageIsRunning()) ? null : startStorage();
  try {
    await waitForStorage();
    run("npx", ["tsx", "prisma/demo-seed.ts"]);
  } finally {
    storage?.kill();
  }
}

async function setup() {
  startDatabase();
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npx", ["prisma", "db", "seed"], { SKIP_SAMPLE_ITEMS: "1", RESET_ADMIN_PASSWORD: "1" });
  await seedDemo();
  console.log("\nReady. Start everything with: npm run local:start");
}

function start() {
  startDatabase();
  const storage = startStorage();
  const next = spawn("npx", ["next", "dev", "--port", NEXT_PORT], { stdio: "inherit", env: process.env });
  const stop = () => {
    storage.kill();
    next.kill();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next.on("exit", (code) => {
    storage.kill();
    process.exit(code ?? 0);
  });
  console.log(`\nFindr: http://localhost:${NEXT_PORT}  (storage: ${process.env.R2_ENDPOINT})`);
}

async function main() {
  const command = process.argv[2];
  if (!["setup", "start", "stop", "reset", "demo"].includes(command)) {
    console.error("Use one of: setup, start, stop, reset, demo");
    process.exit(1);
  }
  ensureEnvFile();
  process.loadEnvFile(ENV_FILE);

  if (command === "stop") return run("docker", ["compose", "stop", "db"]);
  if (command === "reset") {
    run("docker", ["compose", "down", "-v"]);
    rmSync(".local-storage", { recursive: true, force: true });
    return setup();
  }
  if (command === "setup") return setup();
  if (command === "demo") {
    startDatabase();
    return seedDemo();
  }
  return start();
}

main();
