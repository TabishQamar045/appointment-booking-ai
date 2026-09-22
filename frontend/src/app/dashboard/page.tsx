"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { BookingForm } from "@/components/appointments/booking-form";
import { api, ApiError } from "@/lib/api";
import type { Appointment } from "@/lib/types";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ appointments: Appointment[] }>("/appointments")
      .then((res) => {
        if (!cancelled) setAppointments(res.appointments);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load appointments.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your appointments</h1>
          <p className="text-sm text-muted-foreground">
            Book directly below, or use the chat assistant for a more natural flow.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
          {showForm ? "Close form" : "Book directly"}
        </Button>
      </div>

      {showForm && (
        <BookingForm
          description="Manually pick a service, date, and time."
          onCreated={(appointment) => {
            setAppointments((prev) => [...prev, appointment]);
            setShowForm(false);
            toast.success("Appointment booked");
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading appointments...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <AppointmentList appointments={appointments} />
      )}
    </div>
  );
}
