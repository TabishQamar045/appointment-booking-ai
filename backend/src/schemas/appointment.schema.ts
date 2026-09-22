import { z } from "zod";

// Assumption: services are a fixed, small list for this prototype rather
// than a separate `services` table - simplest thing that satisfies "service
// dropdown" in the frontend requirements.
export const SERVICE_OPTIONS = [
  "General Consultation",
  "Dental Cleaning",
  "Haircut",
  "Massage Therapy",
  "Eye Exam",
] as const;

export const createAppointmentSchema = z.object({
  serviceName: z.enum(SERVICE_OPTIONS),
  scheduledAt: z.string().datetime({ message: "scheduledAt must be an ISO 8601 datetime" }),
  notes: z.string().max(1000).optional(),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
