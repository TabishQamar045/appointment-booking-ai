import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(500px circle at 20% 20%, oklch(0.68 0.24 350 / 25%), transparent), radial-gradient(400px circle at 80% 80%, oklch(0.55 0.22 300 / 20%), transparent)",
        }}
      />
      <div className="flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-gradient">Glow Studio</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
