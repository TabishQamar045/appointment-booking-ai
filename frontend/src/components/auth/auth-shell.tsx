import Link from "next/link";
import { Sparkles, CheckCircle2, Star } from "lucide-react";

const FEATURES = [
  "Book in under 60 seconds",
  "AI assistant handles the scheduling for you",
  "22+ services across hair, skin, nails, makeup & more",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 md:grid-cols-2">
      {/* Marketing panel - hidden below md (768px), that's what the mobile
          wordmark in the form panel is for. Was gated at lg (1024px), which
          hid it on a lot of ordinary laptop-width browser windows. */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 md:flex">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(600px circle at 15% 10%, oklch(0.68 0.24 350 / 30%), transparent), radial-gradient(500px circle at 90% 90%, oklch(0.55 0.22 300 / 25%), transparent)",
          }}
        />
        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-gradient">Glow Studio</span>
        </Link>

        <div className="max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Your glow-up is <span className="text-gradient">one login away.</span>
          </h1>
          <ul className="mt-8 flex flex-col gap-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass max-w-sm rounded-2xl p-5">
          <div className="flex gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            &ldquo;The balayage came out exactly like my Pinterest board. Booking through
            the chat was so easy too.&rdquo;
          </p>
          <p className="mt-3 text-sm font-medium">Mira K.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden p-4">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 md:hidden"
          style={{
            background:
              "radial-gradient(500px circle at 20% 20%, oklch(0.68 0.24 350 / 25%), transparent), radial-gradient(400px circle at 80% 80%, oklch(0.55 0.22 300 / 20%), transparent)",
          }}
        />
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-xl font-bold md:hidden"
        >
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-gradient">Glow Studio</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
