import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      passwordHash,
    },
  });

  await prisma.appointment.createMany({
    data: [
      {
        userId: alice.id,
        serviceName: "Dental Cleaning",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // +3 days
        status: "confirmed",
        notes: "Routine checkup",
      },
      {
        userId: alice.id,
        serviceName: "Haircut",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // +7 days
        status: "pending",
        notes: null,
      },
      {
        userId: bob.id,
        serviceName: "General Consultation",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // +2 days
        status: "pending",
        notes: "First-time visit",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:");
  console.log(`  alice@example.com / password123 (user id ${alice.id})`);
  console.log(`  bob@example.com   / password123 (user id ${bob.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
