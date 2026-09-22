"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const STATUS_VARIANT: Record<AppointmentStatus, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

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
              <p className="font-medium">{appt.serviceName}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(appt.scheduledAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
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
