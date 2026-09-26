import { prisma } from "../lib/prisma";
import type { UpdateBusinessHoursInput } from "../schemas/businessHours.schema";

export async function getBusinessHours() {
  return prisma.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
}

// Bulk-replace all 7 rows in one transaction - there's no per-day CRUD,
// the admin edits the whole week and saves it at once.
export async function setBusinessHours(input: UpdateBusinessHoursInput) {
  await prisma.$transaction(
    input.days.map((day) =>
      prisma.businessHours.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        update: day,
        create: day,
      })
    )
  );
  return getBusinessHours();
}
