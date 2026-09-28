import { execSync } from "node:child_process";
import { E2E_DATABASE_URL } from "./env";

// Runs once before the whole e2e suite (not per-test, unlike the backend's
// vitest suite, which can afford a truncate-per-test since it never starts
// real servers). Without this, repeated local runs accumulate real
// appointments at the same "N days from today" offsets the specs use,
// eventually exhausting slots and making the suite flaky in a way that has
// nothing to do with an actual bug - `prisma migrate reset` drops and
// reapplies everything, and (since a seed script is configured in
// backend/package.json) automatically reseeds the service catalog, business
// hours, and admin account the specs depend on.
export default function globalSetup() {
  execSync("npx prisma migrate reset --force --skip-generate", {
    cwd: "../backend",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "inherit",
  });
}
