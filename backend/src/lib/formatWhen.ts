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
