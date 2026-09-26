import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import * as chatService from "../services/chat.service";
import * as appointmentsService from "../services/appointments.service";
import * as servicesService from "../services/services.service";
import { extractBookingInfo, type BookingExtraction } from "../services/ai.service";
import { notifyAdminsOfNewBooking } from "../services/notifications.service";
import { AppError } from "../lib/AppError";

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

  const catalog = await servicesService.listActiveServices();
  const history = await chatService.listMessages(sessionId);
  const extraction = await extractBookingInfo(
    history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    content,
    catalog.map((s) => s.name)
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
    createdAppointment = await tryAutoBook(req.user.id, extraction, catalog);
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
async function tryAutoBook(
  userId: string,
  extraction: BookingExtraction,
  catalog: Array<{ id: string; name: string }>
) {
  if (!extraction.service || !extraction.date || !extraction.time) return null;

  const service = catalog.find((s) => s.name.toLowerCase() === extraction.service!.toLowerCase());
  if (!service) {
    // Model returned a service name outside our catalog - don't silently
    // book something invalid; the frontend's fallback form is the recovery
    // path (user picks a real option from the dropdown instead).
    return null;
  }

  // UTC-literal construction, matching availability.service.ts's convention:
  // date/time are a fixed "salon wall clock" with no real timezone, so both
  // sides must build/read the same way or the AI's booked time could drift
  // from what was actually checked as available.
  const scheduledAt = new Date(`${extraction.date}T${extraction.time}:00.000Z`);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  try {
    const appointment = await appointmentsService.createAppointment(userId, {
      serviceId: service.id,
      scheduledAt: scheduledAt.toISOString(),
      notes: "Booked via AI chat assistant",
    });
    await notifyAdminsOfNewBooking(appointment);
    return appointment;
  } catch (err) {
    // Slot got taken between extraction and booking (or any other
    // create-time validation failure) - fail soft, let the fallback form
    // recover rather than surfacing a raw 409/500 from inside a chat reply.
    if (err instanceof AppError) return null;
    throw err;
  }
}
