import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import * as chatService from "../services/chat.service";
import * as appointmentsService from "../services/appointments.service";
import * as servicesService from "../services/services.service";
import { getAvailableSlots } from "../services/availability.service";
import { extractBookingInfo, type BookingExtraction } from "../services/ai.service";
import { notifyAdminsOfNewBooking } from "../services/notifications.service";
import { AppError } from "../lib/AppError";
import { formatWhen, formatDateOnly } from "../lib/formatWhen";

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

  // For every intent below, the AI only ever recognizes WHAT is being asked -
  // the actual answer (or action) comes from this controller reading/writing
  // the real database, and extraction.assistantReply gets overwritten with
  // the real outcome before it's ever saved or shown to the user. This is
  // what stops the model from hallucinating bookings, slots, or a "done!"
  // that didn't actually happen.
  let createdAppointment = null;
  if (extraction.intent === "check_appointments") {
    extraction.assistantReply = await describeAppointments(req.user.id);
  } else if (extraction.intent === "check_availability") {
    extraction.assistantReply = await describeAvailability(extraction, catalog);
  } else if (extraction.intent === "book_appointment" && extraction.isComplete) {
    createdAppointment = await tryAutoBook(req.user.id, extraction, catalog);
    extraction.assistantReply = createdAppointment
      ? describeBookingConfirmation(createdAppointment)
      : "I couldn't book that automatically - that time may no longer be available. Pick another time below and I'll get it booked.";
  }

  const assistantMessage = await chatService.saveMessage(
    sessionId,
    "assistant",
    extraction.assistantReply,
    extraction as unknown as Prisma.InputJsonValue
  );

  // The fallback form covers both "still missing details" and "auto-book
  // attempted but failed" (e.g. the slot got taken) - either way, the user
  // needs to pick a real option from the form instead of retyping in chat.
  const needsForm = extraction.intent === "book_appointment" && !createdAppointment;

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

// Answers "do I have a booking?" from the same appointments table the
// dashboard reads - deterministic, no AI involved, so it can't hallucinate a
// booking or ask the user for identifying info they've already given us by
// being logged in.
async function describeAppointments(userId: string): Promise<string> {
  const appointments = await appointmentsService.listAppointments(userId);
  const active = appointments.filter((a) => a.status !== "cancelled");

  if (active.length === 0) {
    return "You don't have any appointments booked with us right now. Want to book one?";
  }

  const lines = active.map(
    (a) => `- ${a.service.name} on ${formatWhen(a.scheduledAt)} (${a.status})`
  );
  return `Here's what I have on file for you:\n${lines.join("\n")}`;
}

// Answers "what times are open?" from the same availability math the
// booking form's slot picker uses - the AI never gets to list times itself,
// since it has no way to know what's actually still open.
async function describeAvailability(
  extraction: BookingExtraction,
  catalog: Array<{ id: string; name: string }>
): Promise<string> {
  // Missing service or date: keep the AI's own clarifying question rather
  // than guessing what to ask for.
  if (!extraction.service || !extraction.date) return extraction.assistantReply;

  const service = catalog.find((s) => s.name.toLowerCase() === extraction.service!.toLowerCase());
  if (!service) {
    return `I don't have "${extraction.service}" in our service list - could you pick from one of our actual services?`;
  }

  const slots = await getAvailableSlots(service.id, extraction.date);
  const when = formatDateOnly(extraction.date);
  if (slots.length === 0) {
    return `There are no open times for ${service.name} on ${when} - want to try another date?`;
  }
  return `Here are the open times for ${service.name} on ${when}: ${slots.join(", ")}. Just tell me which one and I'll book it.`;
}

function describeBookingConfirmation(
  appointment: Awaited<ReturnType<typeof appointmentsService.createAppointment>>
): string {
  return `Done! I've booked your ${appointment.service.name} for ${formatWhen(
    appointment.scheduledAt
  )}. It's ${appointment.status} until the salon confirms it.`;
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
