"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { Customer } from "@/lib/types";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ customers: Customer[] }>("/admin/customers")
      .then((res) => setCustomers(res.customers))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load customers."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Everyone who has signed up to book.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {customers.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.provider !== "local" && <Badge variant="secondary">{c.provider}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Joined{" "}
                    {new Date(c.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
                <Badge variant="outline">
                  {c._count.appointments} booking{c._count.appointments === 1 ? "" : "s"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
