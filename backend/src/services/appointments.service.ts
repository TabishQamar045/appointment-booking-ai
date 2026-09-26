import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { assertSlotAvailable } from "./availability.service";
import type { CreateAppointmentInput } from "../schemas/appointment.schema";
import type { AppointmentStatus } from "@prisma/client";

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw AppError.notFound("Appointment not found", "APPOINTMENT_NOT_FOUND");
  }
  return prisma.appointment.update({
    where: { id },
    data: { status },
    include: { service: true, user: { select: { id: true, name: true, email: true } } },
  });
}

export async function listAppointments(userId: string, status?: AppointmentStatus) {
  return prisma.appointment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { service: true },
    orderBy: { scheduledAt: "asc" },
  });
}

// Admin view across all customers - same shape plus who booked it.
export async function listAllAppointments(status?: AppointmentStatus) {
  return prisma.appointment.findMany({
    where: status ? { status } : {},
    include: { service: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  // Cheap existence check - always true for the self-serve path (userId
  // comes from the JWT), but an admin booking on a customer's behalf can
  // pass any uuid, so this is the one place that guards both.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.notFound("Customer not found", "USER_NOT_FOUND");
  }

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
