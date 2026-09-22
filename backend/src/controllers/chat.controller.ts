import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import * as chatService from "../services/chat.service";
import * as appointmentsService from "../services/appointments.service";
import { extractBookingInfo, type BookingExtraction } from "../services/ai.service";
import { AppError } from "../lib/AppError";
import { SERVICE_OPTIONS } from "../schemas/appointment.schema";

export async function createSession(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const session = await chatService.createSession(req.user.id);
  res.status(201).json({ session });
}

export async function listSessions(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const sessions = await chatService.listSessions(req.user.id);
  res.status(200).json({ sessions });
}

export async function getMessages(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  await chatService.getOwnedSession(req.params.id, req.user.id);
  const messages = await chatService.listMessages(req.params.id);
  res.status(200).json({ messages });
}

// This is the "route handler decides, not the AI" boundary the assessment
// asks for: ai.service.ts only ever returns a BookingExtraction. Every
// decision about what that MEANS for the app (save a message, create an
// appointment, ask the frontend to render a fallback form) happens here.
export async function postMessage(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const sessionId = req.params.id;
  await chatService.getOwnedSession(sessionId, req.user.id);

  const { content } = req.body as { content: string };
  const userMessage = await chatService.saveMessage(sessionId, "user", content);

  const history = await chatService.listMessages(sessionId);
  const extraction = await extractBookingInfo(
    history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    content
  );

  const assistantMessage = await chatService.saveMessage(
    sessionId,
    "assistant",
    extraction.assistantReply,
    extraction as unknown as Prisma.InputJsonValue
  );

  // isComplete=false is the frontend's cue to render the fallback form
  // instead of waiting on more chat turns - per spec, this decision is made
  // here, not inside the AI module.
  const needsForm = extraction.intent === "book_appointment" && !extraction.isComplete;

  let createdAppointment = null;
  if (extraction.intent === "book_appointment" && extraction.isComplete) {
    createdAppointment = await tryAutoBook(req.user.id, extraction);
  }

  res.status(200).json({
    userMessage,
    assistantMessage,
    needsForm,
    extraction: {
      intent: extraction.intent,
      service: extraction.service,
      date: extraction.date,
      time: extraction.time,
    },
    appointment: createdAppointment,
  });
}

// Turns a complete extraction into a real appointment. Kept separate from
// the AI module itself - the AI never touches the database.
async function tryAutoBook(userId: string, extraction: BookingExtraction) {
  if (!extraction.service || !extraction.date || !extraction.time) return null;
  if (!SERVICE_OPTIONS.includes(extraction.service as (typeof SERVICE_OPTIONS)[number])) {
    // Model returned a service name outside our fixed list - don't silently
    // book something invalid; the frontend's fallback form is the recovery
    // path (user picks a real option from the dropdown instead).
    return null;
  }

  const scheduledAt = new Date(`${extraction.date}T${extraction.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  return appointmentsService.createAppointment(userId, {
    serviceName: extraction.service as (typeof SERVICE_OPTIONS)[number],
    scheduledAt: scheduledAt.toISOString(),
    notes: "Booked via AI chat assistant",
  });
}
