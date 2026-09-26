import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import type { CreateServiceInput, UpdateServiceInput } from "../schemas/service.schema";

export async function listActiveServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

// Admin view includes inactive services too, so they can be reactivated.
export async function listAllServices() {
  return prisma.service.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createService(input: CreateServiceInput) {
  const existing = await prisma.service.findUnique({ where: { name: input.name } });
  if (existing) {
    throw AppError.conflict("A service with this name already exists", "SERVICE_NAME_TAKEN");
  }
  return prisma.service.create({ data: input });
}

export async function updateService(id: string, input: UpdateServiceInput) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Service not found", "SERVICE_NOT_FOUND");
  }
  if (input.name && input.name !== existing.name) {
    const nameTaken = await prisma.service.findUnique({ where: { name: input.name } });
    if (nameTaken) {
      throw AppError.conflict("A service with this name already exists", "SERVICE_NAME_TAKEN");
    }
  }
  return prisma.service.update({ where: { id }, data: input });
}
