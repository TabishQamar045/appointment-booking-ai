import { z } from "zod";

export const SERVICE_CATEGORIES = ["hair", "skin", "nails", "body_spa", "makeup", "grooming"] as const;

export const createServiceSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(SERVICE_CATEGORIES),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
