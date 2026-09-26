"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/admin/services", label: "Services" },
  { href: "/admin/hours", label: "Business Hours" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Defense in depth, not the security boundary - proxy.ts only checks that
  // *some* authenticated user is present (it can't see the role, since the
  // cookie is httpOnly). The backend's requireAdmin is what actually blocks
  // a non-admin from doing anything here; this just bounces them out of a
  // UI they can't use.
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-gradient">Glow Studio</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-secondary-foreground">
                Admin
              </span>
            </Link>
            <nav className="flex gap-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    size="sm"
                    className="font-normal"
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="font-normal">
                  Customer View
                </Button>
              </Link>
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </header>
      <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 py-6")}>{children}</main>
    </div>
  );
}
