"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { BookingForm } from "@/components/appointments/booking-form";
import { api, ApiError } from "@/lib/api";
import type { Appointment } from "@/lib/types";

// useSearchParams() opts the page out of static prerendering unless wrapped
// in Suspense - split out so the top-level export can provide that boundary.
function DashboardContent() {
  const searchParams = useSearchParams();
  // "Book" on a service card (see /services) links here with ?service=<id>
  // to open the form pre-filled, rather than dropping the user on a blank
  // dashboard after they already picked what they want.
  const preselectedServiceId = searchParams.get("service");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(preselectedServiceId));

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
        <Button
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "default"}
          className={!showForm ? "gradient-bg text-primary-foreground" : undefined}
        >
          {showForm ? "Close form" : "Book directly"}
        </Button>
      </div>

      {showForm && (
        <BookingForm
          description="Manually pick a service, date, and time."
          initialServiceId={preselectedServiceId}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
