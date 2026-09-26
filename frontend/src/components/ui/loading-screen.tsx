import { Sparkles } from "lucide-react";

// Branded stand-in for the auth-gate's "checking session" moment (initial
// load, and the brief window during logout/redirect) - a bare "Loading..."
// text looked out of place next to the rest of the dark-glam UI.
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground">Loading Glow Studio...</span>
    </div>
  );
}
