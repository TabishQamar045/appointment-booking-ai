"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

export function MarketingNavbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-gradient">Glow Studio</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "font-medium text-muted-foreground hover:text-foreground",
                  pathname === link.href && "text-foreground"
                )}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && user ? (
            <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
              <Button size="sm" className="gradient-bg text-primary-foreground">
                Go to {user.role === "admin" ? "Admin" : "Dashboard"}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gradient-bg text-primary-foreground">
                  Book Now
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
