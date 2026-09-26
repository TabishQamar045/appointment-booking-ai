import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const businessHoursDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(timeRegex, "openTime must be HH:mm"),
  closeTime: z.string().regex(timeRegex, "closeTime must be HH:mm"),
  isClosed: z.boolean(),
});

// Bulk-replace all 7 rows in one call - there's no partial-week concept.
export const updateBusinessHoursSchema = z.object({
  days: z.array(businessHoursDaySchema).length(7),
});

export type UpdateBusinessHoursInput = z.infer<typeof updateBusinessHoursSchema>;
