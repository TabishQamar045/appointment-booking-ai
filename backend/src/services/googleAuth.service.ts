import { env } from "../config/env";
import { AppError } from "../lib/AppError";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

// Exchanges the one-time authorization code for tokens, then fetches the
// user's profile. Two round-trips to Google, same as any standard OAuth2
// authorization-code flow - no client library needed for something this
// small.
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    console.error("[google-auth] token exchange failed", tokenRes.status, body);
    throw new AppError("Google sign-in failed", 502, "GOOGLE_AUTH_ERROR");
  }

  const { access_token } = (await tokenRes.json()) as GoogleTokenResponse;

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    console.error("[google-auth] userinfo fetch failed", userRes.status);
    throw new AppError("Google sign-in failed", 502, "GOOGLE_AUTH_ERROR");
  }

  const profile = (await userRes.json()) as GoogleUserInfo;

  if (!profile.email_verified) {
    throw AppError.badRequest(
      "Your Google email must be verified to sign in",
      "GOOGLE_EMAIL_UNVERIFIED"
    );
  }

  return { googleId: profile.sub, email: profile.email, name: profile.name };
}
