import Link from "next/link";
import { Clock, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

const VALUES = [
  { title: "Skilled hands", body: "Every stylist and therapist is trained, licensed, and genuinely obsessed with the craft." },
  { title: "No guesswork", body: "Real-time availability means the time you book is the time you get - no double-booked chairs." },
  { title: "For everyone", body: "Hair, skin, nails, makeup, and grooming - one studio, every service, unisex-friendly." },
];

const HOURS = [
  { day: "Monday - Saturday", time: "9:00 AM - 7:00 PM" },
  { day: "Sunday", time: "Closed" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        <section className="px-4 py-20 text-center sm:px-6">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Our Story
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl font-heading text-4xl font-bold sm:text-5xl">
            A studio built for <span className="text-gradient">your glow-up</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
            Glow Studio started with a simple idea: booking a beauty appointment
            shouldn&apos;t be harder than the service itself. So we built one calendar,
            one place, for everything - hair, skin, nails, makeup, and grooming -
            and made booking as easy as sending a text.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="glass rounded-2xl p-6">
                <h3 className="font-heading text-lg font-bold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/50 bg-secondary/20 px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-2xl font-bold">
                <MapPin className="h-5 w-5 text-primary" /> Find us
              </h2>
              <p className="mt-3 text-muted-foreground">123 Glow Avenue, Suite 2, Your City</p>
            </div>
            <div>
              <h2 className="flex items-center gap-2 font-heading text-2xl font-bold">
                <Clock className="h-5 w-5 text-primary" /> Hours
              </h2>
              <div className="mt-3 space-y-1">
                {HOURS.map((h) => (
                  <p key={h.day} className="flex justify-between text-sm text-muted-foreground">
                    <span>{h.day}</span>
                    <span>{h.time}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-bold">Come see us</h2>
          <div className="mt-6">
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
