// Shared between playwright.config.ts and global-setup.ts - kept in one
// place so the two can't drift apart.
export const BACKEND_PORT = 4102;
export const FRONTEND_PORT = 3100;
// Overridable so CI (a Postgres service container with its own user/db
// naming, see .github/workflows/test.yml) doesn't have to match a local
// dev machine's Postgres setup.
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://mac@localhost:5432/appointment_booking_e2e?schema=public";
