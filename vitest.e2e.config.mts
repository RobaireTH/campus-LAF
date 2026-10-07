import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

import { E2E_BASE_URL, e2eDatabaseUrl } from "./e2e/support/env.mjs";

config({ quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./e2e/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: ["./e2e/support/global-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 240_000,
    env: { DATABASE_URL: e2eDatabaseUrl(), E2E_BASE_URL },
  },
});
