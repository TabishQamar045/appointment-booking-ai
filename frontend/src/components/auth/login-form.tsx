"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth, isApiError } from "@/contexts/auth-context";
import { GoogleSignInButton } from "./google-button";

// Google sign-in errors land here as a full-page redirect (there's no
// client-side promise to catch), so the error comes in via a query param
// instead - see auth.controller.ts's googleCallback.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: "Google sign-in didn't work. Please try again.",
};

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    googleError ? (GOOGLE_ERROR_MESSAGES[googleError] ?? "Something went wrong.") : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back to Glow Studio.</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <GoogleSignInButton label="Continue with Google" />
      </CardContent>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-2">
          <Button
            type="submit"
            className="w-full gradient-bg text-primary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
