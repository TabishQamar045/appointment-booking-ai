"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const STATUS_VARIANT: Record<AppointmentStatus, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

// Formats with an explicit UTC timezone, matching how scheduledAt was
// constructed (a fixed salon wall-clock, not a real timezone-aware instant -
// see backend/src/services/availability.service.ts). Without this, a
// viewer's browser would silently shift the displayed time.
function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No appointments yet. Book one using the form or ask the chat assistant.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {appointments.map((appt) => (
        <Card key={appt.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{appt.service.name}</p>
              <p className="text-sm text-muted-foreground">{formatScheduledAt(appt.scheduledAt)}</p>
              <p className="text-xs text-muted-foreground">
                {appt.service.durationMinutes} min &middot; ${appt.service.price}
              </p>
              {appt.notes && (
                <p className="mt-1 text-xs text-muted-foreground italic">{appt.notes}</p>
              )}
            </div>
            <Badge variant={STATUS_VARIANT[appt.status]} className="capitalize">
              {appt.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
