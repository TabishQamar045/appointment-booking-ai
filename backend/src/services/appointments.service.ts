import { prisma } from "../lib/prisma";
import type { CreateAppointmentInput } from "../schemas/appointment.schema";
import type { AppointmentStatus } from "@prisma/client";

export async function listAppointments(userId: string, status?: AppointmentStatus) {
  return prisma.appointment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: {
      userId,
      serviceName: input.serviceName,
      scheduledAt: new Date(input.scheduledAt),
      notes: input.notes,
      // Assumption: bookings start as "pending" and would be confirmed by
      // staff/an admin flow in a real product - out of scope here, so
      // there's no confirm/cancel endpoint, just the status field on the model.
      status: "pending",
    },
  });
}
