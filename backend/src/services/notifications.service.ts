import { prisma } from "../lib/prisma";
import type { Appointment, Service, User } from "@prisma/client";

type BookedAppointment = Appointment & { service: Service; user: Pick<User, "id" | "name" | "email"> };

function formatWhen(scheduledAt: Date) {
  // UTC-literal, matching the salon-wall-clock convention used everywhere
  // else (availability.service.ts, the frontend's appointment list).
  return scheduledAt.toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Fans out to every admin - there's currently only ever one seeded, but
// nothing stops a second from existing.
export async function notifyAdminsOfNewBooking(appointment: BookedAppointment) {
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "booking_requested" as const,
      message: `${appointment.user.name} requested ${appointment.service.name} on ${formatWhen(
        appointment.scheduledAt
      )}.`,
      appointmentId: appointment.id,
    })),
  });
}

export async function notifyCustomerOfStatusChange(
  appointment: BookedAppointment,
  status: "confirmed" | "cancelled",
  reason?: string
) {
  const when = formatWhen(appointment.scheduledAt);
  const message =
    status === "confirmed"
      ? `Your ${appointment.service.name} appointment on ${when} was confirmed.`
      : `Your ${appointment.service.name} appointment on ${when} was cancelled.${
          reason ? ` Reason: ${reason}` : ""
        }`;

  await prisma.notification.create({
    data: {
      userId: appointment.userId,
      type: status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
      message,
      appointmentId: appointment.id,
    },
  });
}

export async function listNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { notifications, unreadCount };
}

export async function markRead(userId: string, id: string) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
