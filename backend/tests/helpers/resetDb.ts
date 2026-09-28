import { prisma } from "../../src/lib/prisma";

const TABLES = [
  "notifications",
  "chat_messages",
  "chat_sessions",
  "appointments",
  "services",
  "business_hours",
  "users",
];

// Runs before every single test (see tests/setup.ts's global beforeEach) -
// full truncate rather than per-test transactions, since Prisma doesn't make
// transaction-per-test rollback straightforward and a truncate against a
// small local test DB is fast enough not to matter.
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`
  );

  // Every day open 9:00-19:00 except Sunday - same convention as
  // prisma/seed.ts - so any test touching availability/booking gets a real
  // week to work with without re-declaring business hours itself.
  await prisma.businessHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      openTime: "09:00",
      closeTime: "19:00",
      isClosed: dayOfWeek === 0,
    })),
  });
}
