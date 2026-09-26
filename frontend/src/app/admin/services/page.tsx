"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type Service, type ServiceCategory } from "@/lib/types";

interface ServiceFormValues {
  name: string;
  category: ServiceCategory;
  description: string;
  durationMinutes: string;
  price: string;
}

const EMPTY_FORM: ServiceFormValues = {
  name: "",
  category: "hair",
  description: "",
  durationMinutes: "45",
  price: "50",
};

function ServiceForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ServiceFormValues;
  submitLabel: string;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Category</Label>
          <Select
            value={values.category}
            onValueChange={(v) => setValues((s) => ({ ...s, category: v as ServiceCategory }))}
          >
            <SelectTrigger className="w-full">
              {/* Base UI's SelectValue shows the raw enum value ("hair")
                  unless given a render function for the display label. */}
              <SelectValue>{() => SERVICE_CATEGORY_LABELS[values.category]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {SERVICE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            min={5}
            max={480}
            value={values.durationMinutes}
            onChange={(e) => setValues((v) => ({ ...v, durationMinutes: e.target.value }))}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Price ($)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Description (optional)</Label>
        <Textarea
          rows={2}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="gradient-bg text-primary-foreground">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ services: Service[] }>("/admin/services")
      .then((res) => setServices(res.services))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(values: ServiceFormValues) {
    const res = await api.post<{ service: Service }>("/admin/services", {
      name: values.name,
      category: values.category,
      description: values.description || undefined,
      durationMinutes: Number(values.durationMinutes),
      price: Number(values.price),
    });
    setServices((prev) => [...prev, res.service]);
    setShowAddForm(false);
    toast.success("Service added");
  }

  async function handleUpdate(id: string, values: ServiceFormValues) {
    const res = await api.patch<{ service: Service }>(`/admin/services/${id}`, {
      name: values.name,
      category: values.category,
      description: values.description || undefined,
      durationMinutes: Number(values.durationMinutes),
      price: Number(values.price),
    });
    setServices((prev) => prev.map((s) => (s.id === id ? res.service : s)));
    setEditingId(null);
    toast.success("Service updated");
  }

  async function toggleActive(service: Service) {
    try {
      const res = await api.patch<{ service: Service }>(`/admin/services/${service.id}`, {
        isActive: !service.isActive,
      });
      setServices((prev) => prev.map((s) => (s.id === service.id ? res.service : s)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update service.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage the catalog customers see when booking.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          variant={showAddForm ? "outline" : "default"}
          className={!showAddForm ? "gradient-bg text-primary-foreground" : undefined}
        >
          {showAddForm ? "Close" : "Add service"}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New service</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceForm
              initial={EMPTY_FORM}
              submitLabel="Add service"
              onSubmit={handleCreate}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="py-4">
                {editingId === service.id ? (
                  <ServiceForm
                    initial={{
                      name: service.name,
                      category: service.category,
                      description: service.description ?? "",
                      durationMinutes: String(service.durationMinutes),
                      price: String(service.price),
                    }}
                    submitLabel="Save changes"
                    onSubmit={(values) => handleUpdate(service.id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{service.name}</p>
                        <Badge variant="secondary">{SERVICE_CATEGORY_LABELS[service.category]}</Badge>
                        {!service.isActive && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.durationMinutes} min &middot; ${service.price}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(service.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={service.isActive ? "ghost" : "default"}
                        onClick={() => toggleActive(service)}
                      >
                        {service.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
