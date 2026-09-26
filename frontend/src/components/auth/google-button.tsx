import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Google's brand guidelines require the official multi-color "G" mark
// rather than a generic icon font glyph.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.73l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.1c.95-2.85 3.6-4.98 6.73-4.98Z"
      />
    </svg>
  );
}

// A plain <a> to /api/auth/google, not a client-side router link or a
// fetch/onClick handler - this must be a real top-level navigation so the
// browser leaves the SPA, follows the backend's redirect to Google, and
// comes back to a fresh page load once the session cookie is set.
export function GoogleSignInButton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Base UI's Button uses a `render` prop (not Radix's `asChild`) to
          swap the underlying element while keeping Button's own styling.
          nativeButton={false} tells it the target isn't a <button> (it's an
          <a>), so it doesn't warn about lost native button semantics. */}
      <Button
        variant="outline"
        className="w-full"
        nativeButton={false}
        render={<a href="/api/auth/google" />}
      >
        <GoogleIcon />
        {label}
      </Button>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}
