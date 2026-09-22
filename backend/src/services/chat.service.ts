import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import type { Prisma } from "@prisma/client";

export async function createSession(userId: string) {
  return prisma.chatSession.create({ data: { userId } });
}

export async function listSessions(userId: string) {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Loads a session and confirms it belongs to `userId` in one query - 404
// (not 403) if it doesn't exist OR belongs to someone else, so we never
// reveal whether a given session id exists for another user.
export async function getOwnedSession(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) {
    throw AppError.notFound("Chat session not found");
  }
  return session;
}

export async function listMessages(sessionId: string) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  aiMetadata?: Prisma.InputJsonValue
) {
  return prisma.chatMessage.create({
    data: { sessionId, role, content, aiMetadata },
  });
}
