import { PrismaClient, ServiceCategory } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Glow Studio's service catalog: name, category, duration (minutes), price.
const SERVICES: Array<{
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  description: string;
}> = [
  // Hair services
  { name: "Haircuts and Styling", category: "hair", durationMinutes: 45, price: 45, description: "A fresh cut and finish tailored to you." },
  { name: "Hair Coloring", category: "hair", durationMinutes: 120, price: 150, description: "Highlights, balayage, full color, or root touch-ups." },
  { name: "Blow-Dry & Event Styling", category: "hair", durationMinutes: 45, price: 55, description: "Polished blow-dry and styling for any occasion." },
  { name: "Hair Treatments", category: "hair", durationMinutes: 90, price: 120, description: "Keratin, deep conditioning, or smoothing treatments." },
  { name: "Perms & Relaxers", category: "hair", durationMinutes: 120, price: 130, description: "Long-lasting curl or straightening treatments." },
  { name: "Hair Extensions", category: "hair", durationMinutes: 150, price: 250, description: "Seamless length and volume, applied by a specialist." },
  // Skin care
  { name: "Facials", category: "skin", durationMinutes: 60, price: 80, description: "A custom facial to cleanse, hydrate, and glow." },
  { name: "Skin Cleansing & Exfoliation", category: "skin", durationMinutes: 45, price: 60, description: "Deep cleanse and gentle exfoliation." },
  { name: "Anti-Aging Treatments", category: "skin", durationMinutes: 60, price: 100, description: "Targeted treatments to smooth and firm." },
  { name: "Acne Treatments", category: "skin", durationMinutes: 45, price: 70, description: "Calming, blemish-focused skin therapy." },
  // Nail care
  { name: "Manicure & Pedicure", category: "nails", durationMinutes: 60, price: 50, description: "Classic mani-pedi with your choice of finish." },
  { name: "Nail Art & Extensions", category: "nails", durationMinutes: 75, price: 65, description: "Gel or acrylic extensions with custom nail art." },
  { name: "Nail Treatments", category: "nails", durationMinutes: 45, price: 40, description: "Repair and strengthening for damaged nails." },
  // Body / spa
  { name: "Waxing", category: "body_spa", durationMinutes: 45, price: 55, description: "Full body or brow waxing." },
  { name: "Threading", category: "body_spa", durationMinutes: 20, price: 15, description: "Precise brow and facial threading." },
  { name: "Massage Therapy", category: "body_spa", durationMinutes: 60, price: 90, description: "A relaxing full-body massage." },
  { name: "Body Scrubs & Wraps", category: "body_spa", durationMinutes: 75, price: 110, description: "Exfoliating scrub or detoxifying body wrap." },
  // Makeup
  { name: "Everyday Makeup", category: "makeup", durationMinutes: 30, price: 40, description: "Natural, polished makeup for daily wear." },
  { name: "Bridal & Event Makeup", category: "makeup", durationMinutes: 90, price: 180, description: "Full glam for weddings and special events." },
  { name: "Makeup Lessons", category: "makeup", durationMinutes: 60, price: 85, description: "One-on-one lesson to master your look." },
  // Grooming (unisex/men's)
  { name: "Beard Trim & Shaping", category: "grooming", durationMinutes: 20, price: 20, description: "Sharp, precise beard grooming." },
  { name: "Men's Haircut & Styling", category: "grooming", durationMinutes: 30, price: 35, description: "Classic or modern cuts, styled to finish." },
];

// Mon-Sat 9:00-19:00, closed Sundays.
const BUSINESS_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "19:00",
  isClosed: dayOfWeek === 0,
}));

function daysFromNow(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@glowstudio.com" },
    update: {},
    create: {
      email: "admin@glowstudio.com",
      name: "Glow Studio Admin",
      passwordHash,
      role: "admin",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: { email: "alice@example.com", name: "Alice Johnson", passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: { email: "bob@example.com", name: "Bob Smith", passwordHash },
  });

  for (const hours of BUSINESS_HOURS) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: hours.dayOfWeek },
      update: hours,
      create: hours,
    });
  }

  const services = await Promise.all(
    SERVICES.map((s) =>
      prisma.service.upsert({
        where: { name: s.name },
        update: s,
        create: s,
      })
    )
  );

  const haircut = services.find((s) => s.name === "Haircuts and Styling")!;
  const facial = services.find((s) => s.name === "Facials")!;
  const manicure = services.find((s) => s.name === "Manicure & Pedicure")!;

  await prisma.appointment.createMany({
    data: [
      { userId: alice.id, serviceId: facial.id, scheduledAt: daysFromNow(3, 11), status: "confirmed", notes: "Routine facial" },
      { userId: alice.id, serviceId: haircut.id, scheduledAt: daysFromNow(7, 14), status: "pending" },
      { userId: bob.id, serviceId: manicure.id, scheduledAt: daysFromNow(2, 10), status: "pending", notes: "First-time visit" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:");
  console.log(`  admin@glowstudio.com / password123 (admin, user id ${admin.id})`);
  console.log(`  alice@example.com    / password123 (user id ${alice.id})`);
  console.log(`  bob@example.com      / password123 (user id ${bob.id})`);
  console.log(`  ${services.length} services seeded across 6 categories`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
