import { config } from "dotenv";
import path from "node:path";
import { beforeEach } from "vitest";

// Runs before anything else in a test file (Vitest always executes
// setupFiles first) - has to win the race against env.ts's own
// `import "dotenv/config"` call, which loads plain .env and would otherwise
// point tests at the dev database. dotenv never overwrites a variable
// that's already set, so loading .env.test here first (with override, so a
// watch-mode rerun picks up edits) is what makes the suite safe to run
// alongside `npm run dev` without touching real data. In CI these are just
// real environment variables already, and .env.test simply won't exist -
// dotenv silently no-ops on a missing file, which is what we want there.
config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

// A dynamic import (not a static one) so it only resolves - and only then
// constructs the PrismaClient inside it - after the config() call above has
// already set DATABASE_URL. A static import would get hoisted above this
// file's own code and run first.
const { resetDb } = await import("./helpers/resetDb");

beforeEach(async () => {
  await resetDb();
});
