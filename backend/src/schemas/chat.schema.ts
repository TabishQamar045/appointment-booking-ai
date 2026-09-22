import { z } from "zod";

export const postChatMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type PostChatMessageInput = z.infer<typeof postChatMessageSchema>;
