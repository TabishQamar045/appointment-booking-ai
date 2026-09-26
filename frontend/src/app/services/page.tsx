"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CATEGORY_ICONS } from "@/components/marketing/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type Service } from "@/lib/types";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ services: Service[] }>("/services")
      .then((res) => setServices(res.services))
      .finally(() => setIsLoading(false));
  }, []);

  function handleBook(serviceId: string) {
    if (user) {
      router.push(`/dashboard?service=${serviceId}`);
    } else {
      router.push("/signup");
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        <section className="px-4 py-16 text-center sm:px-6">
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            Our <span className="text-gradient">Services</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Browse the full menu. Pick what you want, then book directly or let our
            AI assistant handle the scheduling for you.
          </p>
        </section>

        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Loading services...</p>
          ) : (
            SERVICE_CATEGORIES.map((category) => {
              const items = services.filter((s) => s.category === category);
              if (items.length === 0) return null;
              const Icon = CATEGORY_ICONS[category];

              return (
                <section key={category} id={category} className="mb-16 scroll-mt-24">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="gradient-bg flex h-10 w-10 items-center justify-center rounded-full">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h2 className="font-heading text-2xl font-bold">
                      {SERVICE_CATEGORY_LABELS[category]}
                    </h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((service) => (
                      <Card key={service.id} className="glass">
                        <CardContent className="flex items-start justify-between gap-4 p-5">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {service.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {service.durationMinutes} min &middot; ${service.price}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 gradient-bg text-primary-foreground"
                            onClick={() => handleBook(service.id)}
                          >
                            Book
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <section className="border-t border-border/50 px-4 py-16 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-bold">Not sure what you need?</h2>
          <p className="mt-2 text-muted-foreground">
            Chat with our AI assistant and just describe what you want.
          </p>
          <div className="mt-6">
            <Link href={user ? "/dashboard/chat" : "/signup"}>
              <Button size="lg" variant="outline">
                Try the Chat Assistant
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
