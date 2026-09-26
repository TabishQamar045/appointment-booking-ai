"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type Appointment,
  type Service,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  title?: string;
  description?: string;
  // Already-known id (e.g. "Book" clicked on a specific service card).
  initialServiceId?: string | null;
  // Free-text name from the AI's extraction - resolved to an id once the
  // catalog loads, since the chat flow doesn't know ids.
  initialServiceName?: string | null;
  initialDate?: string | null; // "YYYY-MM-DD"
  initialTime?: string | null; // "HH:mm" - preselected only if still open
  onCreated?: (appointment: Appointment) => void;
  onCancel?: () => void;
}

// Reused in two places: the "book directly" panel on the dashboard, and the
// AI chat's fallback form when the assistant can't fully resolve booking
// details on its own (see chat/page.tsx).
export function BookingForm({
  title = "Book an appointment",
  description,
  initialServiceId,
  initialServiceName,
  initialDate,
  initialTime,
  onCreated,
  onCancel,
}: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>(initialServiceId ?? "");
  const [date, setDate] = useState(initialDate ?? "");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ services: Service[] }>("/services")
      .then((res) => {
        setServices(res.services);
        if (!serviceId && initialServiceName) {
          const match = res.services.find(
            (s) => s.name.toLowerCase() === initialServiceName.toLowerCase()
          );
          if (match) setServiceId(match.id);
        }
      })
      .catch(() => setServices([]));
    // Only ever resolve the initial name once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch available slots whenever the service or date changes; any
  // previously-selected time is no longer guaranteed valid. Every setState
  // call is routed through the promise chain (none run synchronously in the
  // effect body) - React flags synchronous setState-in-effect as a likely
  // cascading-render bug.
  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setTime("");

      if (!serviceId || !date) {
        setSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const res = await api.get<{ slots: string[] }>(
          `/availability?serviceId=${serviceId}&date=${date}`
        );
        if (cancelled) return;
        setSlots(res.slots);
        // Best-effort preselect: only takes if the AI-extracted time is
        // still actually open.
        if (initialTime && res.slots.includes(initialTime)) {
          setTime(initialTime);
        }
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setIsLoadingSlots(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serviceId, date, initialTime]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!serviceId || !date || !time) {
      setError("Please choose a service, date, and time.");
      return;
    }

    // UTC-literal, matching the backend's availability math: date/time are a
    // fixed salon wall-clock with no real timezone conversion (see
    // backend/src/services/availability.service.ts).
    const scheduledAt = new Date(`${date}T${time}:00.000Z`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("That date/time doesn't look valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ appointment: Appointment }>("/appointments", {
        serviceId,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes.trim() || undefined,
      });
      onCreated?.(res.appointment);
      setServiceId("");
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
            <Select value={serviceId} onValueChange={(value) => setServiceId(value ?? "")}>
              <SelectTrigger id="service" className="w-full">
                {/* Base UI's SelectValue shows the raw value (a uuid) unless
                    given a render function - it has no way to know the
                    matching item's display label on its own. */}
                <SelectValue placeholder="Choose a service">
                  {() => {
                    const selected = services.find((s) => s.id === serviceId);
                    return selected
                      ? `${selected.name} - $${selected.price} (${selected.durationMinutes} min)`
                      : "Choose a service";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((category) => {
                  const options = services.filter((s) => s.category === category);
                  if (options.length === 0) return null;
                  return (
                    <SelectGroup key={category}>
                      <SelectLabel>{SERVICE_CATEGORY_LABELS[category]}</SelectLabel>
                      {options.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - ${s.price} ({s.durationMinutes} min)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              disabled={!serviceId}
            />
          </div>

          {serviceId && date && (
            <div className="flex flex-col gap-2">
              <Label>Available times</Label>
              {isLoadingSlots ? (
                <p className="text-sm text-muted-foreground">Loading available times...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open times that day - try another date.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      size="sm"
                      variant={time === slot ? "default" : "outline"}
                      className={cn(time === slot && "gradient-bg text-primary-foreground")}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

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
          <Button
            type="submit"
            disabled={isSubmitting || !time}
            className="gradient-bg text-primary-foreground"
          >
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
