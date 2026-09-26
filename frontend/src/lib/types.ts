// Mirrors the backend's response shapes (backend/src/services/*). Kept as
// plain hand-written types rather than a generated client, since the
// surface area is small for this prototype.

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export const SERVICE_CATEGORIES = [
  "hair",
  "skin",
  "nails",
  "body_spa",
  "makeup",
  "grooming",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  hair: "Hair",
  skin: "Skin Care",
  nails: "Nail Care",
  body_spa: "Body & Spa",
  makeup: "Makeup",
  grooming: "Grooming",
};

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  userId: string;
  serviceId: string;
  service: Service;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  // Only present on the admin "all appointments" listing.
  user?: Pick<User, "id" | "name" | "email">;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  provider: "local" | "google" | "facebook";
  createdAt: string;
  _count: { appointments: number };
}

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

export interface BusinessHoursDay {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
