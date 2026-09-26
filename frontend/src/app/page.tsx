import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CATEGORY_ICONS } from "@/components/marketing/category-icon";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/lib/types";

const TESTIMONIALS = [
  { name: "Mira K.", quote: "The balayage came out exactly like my Pinterest board. Booking through the chat was so easy too." },
  { name: "Jordan P.", quote: "Booked a last-minute beard trim in under a minute. This is how every salon should work." },
  { name: "Amara S.", quote: "Facial + brow thread combo is my new monthly ritual. Glow Studio never misses." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(600px circle at 20% 10%, oklch(0.68 0.24 350 / 30%), transparent), radial-gradient(500px circle at 85% 30%, oklch(0.55 0.22 300 / 25%), transparent)",
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-primary" /> Rated 4.9 by 2,000+ clients
            </span>
            <h1 className="mt-6 font-heading text-5xl font-bold tracking-tight sm:text-7xl">
              Your glow-up,
              <br />
              <span className="text-gradient">booked in minutes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Hair, skin, nails, makeup, and more. Book directly or just chat with our
              AI assistant and tell it what you want - it&apos;ll handle the rest.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="gradient-bg text-primary-foreground">
                  Book Now <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline">
                  Explore Services
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Category teaser grid */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="text-center font-heading text-3xl font-bold">Everything you need to glow</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            Six categories, dozens of services, one calendar.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SERVICE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <Link
                  key={category}
                  href={`/services#${category}`}
                  className="glass glow-border group flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-transform hover:-translate-y-1"
                >
                  <div className="gradient-bg flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="font-medium">{SERVICE_CATEGORY_LABELS[category]}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Social proof */}
        <section className="border-y border-border/50 bg-secondary/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-heading text-3xl font-bold">Loved by our clients</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="glass rounded-2xl p-6">
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-4 text-sm font-medium">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-24 text-center sm:px-6">
          <h2 className="font-heading text-4xl font-bold sm:text-5xl">
            Ready for your <span className="text-gradient">glow-up?</span>
          </h2>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" className="gradient-bg text-primary-foreground">
                Book Your Appointment <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
