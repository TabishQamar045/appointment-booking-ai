"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookingForm } from "@/components/appointments/booking-form";
import { api, ApiError } from "@/lib/api";
import type { Appointment, Customer } from "@/lib/types";

const STATUS_VARIANT: Record<Appointment["status"], "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ appointments: Appointment[] }>("/admin/appointments"),
      api.get<{ customers: Customer[] }>("/admin/customers"),
    ])
      .then(([a, c]) => {
        setAppointments(a.appointments);
        setCustomers(c.customers);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load appointments."))
      .finally(() => setIsLoading(false));
  }, []);

  async function updateStatus(id: string, status: Appointment["status"]) {
    setUpdatingId(id);
    try {
      const res = await api.patch<{ appointment: Appointment }>(`/admin/appointments/${id}`, {
        status,
      });
      setAppointments((prev) => prev.map((a) => (a.id === id ? res.appointment : a)));
      toast.success(status === "confirmed" ? "Appointment confirmed" : "Appointment cancelled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update appointment.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Every booking across all customers. Book on a customer&apos;s behalf here.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "default"}
          className={!showForm ? "gradient-bg text-primary-foreground" : undefined}
        >
          {showForm ? "Close" : "New booking"}
        </Button>
      </div>

      {showForm && (
        <BookingForm
          title="Book for a customer"
          customers={customers}
          onCreated={(appointment) => {
            setAppointments((prev) =>
              [...prev, appointment].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
            );
            setShowForm(false);
            toast.success("Appointment booked");
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appointments yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{appt.service.name}</p>
                    <Badge variant={STATUS_VARIANT[appt.status]}>{appt.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {appt.user?.name} ({appt.user?.email})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(appt.scheduledAt).toLocaleString(undefined, {
                      timeZone: "UTC",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {appt.status === "pending" && (
                    <Button
                      size="sm"
                      disabled={updatingId === appt.id}
                      className="gradient-bg text-primary-foreground"
                      onClick={() => updateStatus(appt.id, "confirmed")}
                    >
                      Confirm
                    </Button>
                  )}
                  {appt.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === appt.id}
                      onClick={() => updateStatus(appt.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
