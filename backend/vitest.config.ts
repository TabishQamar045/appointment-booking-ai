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
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      // Excluded as pure wiring/bootstrapping, not business logic - a test
      // that only proves "the app starts" or "types match the .env file"
      // doesn't tell you anything a coverage number should be rewarding.
      exclude: [
        "src/index.ts", // app.listen() - exercised by every API test via createApp(), never run directly
        "src/config/env.ts", // reads process.env, no branching logic worth covering
        "src/types/**",
      ],
      // Global floor, not per-file - `vitest run` (npm test) exits non-zero
      // below this, which is what actually makes it a gate in CI rather
      // than just a number in a report nobody reads.
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
