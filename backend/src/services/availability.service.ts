import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";

// Fixed step for generating candidate start times, independent of any one
// service's own duration - the salon has a single shared calendar, so a
// 90-minute service must still be checked against 45-minute appointments
// already on the books, not just against its own duration's grid.
const SLOT_STEP_MINUTES = 15;

// Design simplification: the whole app treats appointment times as a single
// fixed "salon wall clock" with no real IANA timezone - every date/time is
// constructed and read back as a literal UTC-labeled instant (`...T00:00:00Z`
// + minutes, `.toISOString()` to read back), never through a timezone-aware
// conversion. That keeps business hours, availability math, and what a
// client displays all trivially consistent regardless of what timezone the
// server or the browser happens to be in - correct for a single-location
// salon, at the cost of not supporting real multi-timezone customers.
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function dateAtMinutes(dateStr: string, minutes: number): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCMinutes(minutes);
  return d;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// The one place that decides what's bookable: reused by the public
// availability endpoint, appointment creation (server-side re-validation),
// and the AI chat's auto-booking path, so none of them can drift out of
// sync on what counts as an open slot.
export async function getAvailableSlots(serviceId: string, dateStr: string): Promise<string[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw AppError.notFound("Service not found", "SERVICE_NOT_FOUND");
  }

  const dayOfWeek = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
  const hours = await prisma.businessHours.findUnique({ where: { dayOfWeek } });
  if (!hours || hours.isClosed) {
    return [];
  }

  const openMinutes = timeToMinutes(hours.openTime);
  const closeMinutes = timeToMinutes(hours.closeTime);

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
  const existing = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
    },
    include: { service: { select: { durationMinutes: true } } },
  });

  const busyRanges = existing.map((a) => {
    const start = a.scheduledAt.getTime();
    return { start, end: start + a.service.durationMinutes * 60_000 };
  });

  const now = Date.now();
  const slots: string[] = [];
  for (
    let start = openMinutes;
    start + service.durationMinutes <= closeMinutes;
    start += SLOT_STEP_MINUTES
  ) {
    const candidateStart = dateAtMinutes(dateStr, start).getTime();
    const candidateEnd = candidateStart + service.durationMinutes * 60_000;

    if (candidateStart <= now) continue;

    const overlaps = busyRanges.some((b) => candidateStart < b.end && b.start < candidateEnd);
    if (!overlaps) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
}

// Throws if the requested (serviceId, scheduledAt) is no longer available.
// Called right before creating an appointment - closes the race window
// between a client fetching availability and actually booking it.
export async function assertSlotAvailable(serviceId: string, scheduledAt: Date): Promise<void> {
  const iso = scheduledAt.toISOString();
  const dateStr = iso.slice(0, 10);
  const time = iso.slice(11, 16);

  const slots = await getAvailableSlots(serviceId, dateStr);
  if (!slots.includes(time)) {
    throw AppError.conflict("That time is no longer available", "SLOT_UNAVAILABLE");
  }
}
