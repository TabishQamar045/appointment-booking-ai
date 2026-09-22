"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { SERVICE_OPTIONS, type Appointment, type ServiceName } from "@/lib/types";

interface BookingFormProps {
  title?: string;
  description?: string;
  initialService?: string | null;
  initialDate?: string | null; // "YYYY-MM-DD"
  initialTime?: string | null; // "HH:mm"
  onCreated?: (appointment: Appointment) => void;
  onCancel?: () => void;
}

// Reused in two places: the "book directly" panel on the dashboard, and the
// AI chat's fallback form when the assistant can't fully resolve booking
// details on its own (see chat/page.tsx). Native date/time inputs rather
// than a custom calendar widget - simplest thing that satisfies "date/time
// picker" within the assessment's time budget.
export function BookingForm({
  title = "Book an appointment",
  description,
  initialService,
  initialDate,
  initialTime,
  onCreated,
  onCancel,
}: BookingFormProps) {
  const [service, setService] = useState<string>(
    initialService && (SERVICE_OPTIONS as readonly string[]).includes(initialService)
      ? initialService
      : ""
  );
  const [date, setDate] = useState(initialDate ?? "");
  const [time, setTime] = useState(initialTime ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!service || !date || !time) {
      setError("Please choose a service, date, and time.");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("That date/time doesn't look valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ appointment: Appointment }>("/appointments", {
        serviceName: service as ServiceName,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes.trim() || undefined,
      });
      onCreated?.(res.appointment);
      setService("");
      setDate("");
      setTime("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="service">Service</Label>
            <Select value={service} onValueChange={(value) => setService(value ?? "")}>
              <SelectTrigger id="service" className="w-full">
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardContent className="flex gap-2 pt-0">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Book appointment"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardContent>
      </form>
    </Card>
  );
}
