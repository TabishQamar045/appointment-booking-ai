import { defineConfig, devices } from "@playwright/test";
import { BACKEND_PORT, FRONTEND_PORT, E2E_DATABASE_URL } from "./e2e/env";

// Dedicated ports and a dedicated database (appointment_booking_e2e) - this
// suite runs the real backend and real frontend dev servers against real
// Postgres, deliberately not mocked, so it exercises the full stack
// including the cookie-proxying rewrites in next.config.ts. It never
// touches the appointment_booking dev DB `npm run dev` normally points at;
// globalSetup (e2e/global-setup.ts) resets it to a clean seeded state before
// every run, and every test creates its own randomly-emailed customer on
// top of that, so tests don't collide with each other or across runs.

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: "e2e-test-secret",
        PORT: String(BACKEND_PORT),
        FRONTEND_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
        // Skips the auth rate limiter (see rateLimiter.ts) - a full e2e run
        // signs up several fresh customers, which would otherwise share one
        // rate-limit bucket. Also keeps the AI chat routes reachable without
        // a real GROQ_API_KEY: those specs aren't in this suite (chat needs
        // a live model, see tests/api/chat.test.ts on the backend instead,
        // which mocks it) so an empty key never actually gets used here.
        NODE_ENV: "test",
      },
    },
    {
      command: "npm run dev",
      cwd: ".",
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
        PORT: String(FRONTEND_PORT),
      },
    },
  ],
});
