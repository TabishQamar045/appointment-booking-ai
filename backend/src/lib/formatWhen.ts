// UTC-literal, matching the salon-wall-clock convention used everywhere an
// appointment's scheduledAt is read (availability.service.ts, the frontend's
// appointment list) - never let the server or a viewer's local timezone
// shift the displayed time.
export function formatWhen(scheduledAt: Date): string {
  return scheduledAt.toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Same convention, for a bare "YYYY-MM-DD" with no time component yet
// (e.g. an availability lookup before a specific slot is chosen).
export function formatDateOnly(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
  });
}
