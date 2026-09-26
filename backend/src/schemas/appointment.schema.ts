import { z } from "zod";

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime({ message: "scheduledAt must be an ISO 8601 datetime" }),
  notes: z.string().max(1000).optional(),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
});

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
