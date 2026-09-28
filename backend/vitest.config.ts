import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Real Postgres round-trips per test (resetDb's TRUNCATE) are slower
    // than pure-unit assertions - default 5s timeout was too tight.
    testTimeout: 15000,
    hookTimeout: 15000,
    // Every test file shares one PrismaClient (tests/helpers/resetDb.ts) and
    // truncates the whole DB in a global beforeEach - running files in
    // parallel workers would truncate out from under each other.
    fileParallelism: false,
  },
});
