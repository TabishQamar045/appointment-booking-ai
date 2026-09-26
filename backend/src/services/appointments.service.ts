import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { assertSlotAvailable } from "./availability.service";
import type { CreateAppointmentInput } from "../schemas/appointment.schema";
import type { AppointmentStatus } from "@prisma/client";

export async function listAppointments(userId: string, status?: AppointmentStatus) {
  return prisma.appointment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { service: true },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.isActive) {
    throw AppError.notFound("Service not found", "SERVICE_NOT_FOUND");
  }

  const scheduledAt = new Date(input.scheduledAt);
  await assertSlotAvailable(input.serviceId, scheduledAt);

  return prisma.appointment.create({
    data: {
      userId,
      serviceId: input.serviceId,
      scheduledAt,
      notes: input.notes,
      // Assumption: bookings start as "pending" and would be confirmed by
      // staff/an admin flow in a real product - out of scope here, so
      // there's no confirm/cancel endpoint, just the status field on the model.
      status: "pending",
    },
    include: { service: true },
  });
}
