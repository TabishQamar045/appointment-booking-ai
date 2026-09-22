// Mirrors the backend's response shapes (backend/src/services/*). Kept as
// plain hand-written types rather than a generated client, since the
// surface area is small for this prototype.

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface Appointment {
  id: string;
  userId: string;
  serviceName: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
}

export const SERVICE_OPTIONS = [
  "General Consultation",
  "Dental Cleaning",
  "Haircut",
  "Massage Therapy",
  "Eye Exam",
] as const;

export type ServiceName = (typeof SERVICE_OPTIONS)[number];

export interface ChatSession {
  id: string;
  userId: string;
  createdAt: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  aiMetadata: unknown;
  createdAt: string;
}

export interface BookingExtractionSummary {
  intent: "book_appointment" | "cancel_appointment" | "general_inquiry" | "unclear";
  service: string | null;
  date: string | null;
  time: string | null;
}

export interface PostMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  needsForm: boolean;
  extraction: BookingExtractionSummary;
  appointment: Appointment | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
