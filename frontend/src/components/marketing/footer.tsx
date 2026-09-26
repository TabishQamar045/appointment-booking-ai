import Link from "next/link";
import { Sparkles, AtSign, MapPin, Clock } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="flex items-center gap-2 font-heading text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Glow Studio</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Hair, skin, nails, makeup, and more - your glow-up, booked in minutes.
          </p>
          <a
            href="#"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <AtSign className="h-4 w-4" /> glowstudio
          </a>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="mb-3 font-medium text-foreground">Visit us</p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            123 Glow Avenue, Suite 2, Your City
          </p>
          <p className="mt-2 flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            Mon-Sat, 9:00 AM - 7:00 PM
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-medium text-foreground">Explore</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link href="/services" className="hover:text-foreground">
                Services
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Book an appointment
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Glow Studio. All rights reserved.
      </div>
    </footer>
  );
}
