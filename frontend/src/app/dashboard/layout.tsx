"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Appointments" },
  { href: "/dashboard/chat", label: "Chat Assistant" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-gradient">Glow Studio</span>
            </Link>
            <nav className="flex gap-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("font-normal")}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="font-normal">
                    Admin
                  </Button>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && user && (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">{user.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Log out
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
