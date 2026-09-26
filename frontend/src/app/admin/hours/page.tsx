"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { BusinessHoursDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminHoursPage() {
  const [days, setDays] = useState<BusinessHoursDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ days: BusinessHoursDay[] }>("/admin/business-hours")
      .then((res) => setDays([...res.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)))
      .finally(() => setIsLoading(false));
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<BusinessHoursDay>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await api.put<{ days: BusinessHoursDay[] }>("/admin/business-hours", {
        days: days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          openTime: d.openTime,
          closeTime: d.closeTime,
          isClosed: d.isClosed,
        })),
      });
      setDays([...res.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
      toast.success("Business hours updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save business hours.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Business Hours</h1>
        <p className="text-sm text-muted-foreground">
          Customers can only book within these hours - available times are computed from this
          schedule automatically.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            {days.map((day) => (
              <div
                key={day.dayOfWeek}
                className="flex flex-wrap items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0"
              >
                <span className="w-28 font-medium">{DAY_NAMES[day.dayOfWeek]}</span>
                <Button
                  type="button"
                  size="sm"
                  variant={day.isClosed ? "outline" : "default"}
                  className={cn(!day.isClosed && "gradient-bg text-primary-foreground")}
                  onClick={() => updateDay(day.dayOfWeek, { isClosed: !day.isClosed })}
                >
                  {day.isClosed ? "Closed" : "Open"}
                </Button>
                {!day.isClosed && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="time"
                        value={day.openTime}
                        onChange={(e) => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                        className="w-32"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="gradient-bg text-primary-foreground"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
