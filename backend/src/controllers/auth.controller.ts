import type { Request, Response } from "express";
import crypto from "node:crypto";
import * as authService from "../services/auth.service";
import * as googleAuthService from "../services/googleAuth.service";
import { AUTH_COOKIE_NAME } from "../middleware/auth";
import { env, isProduction } from "../config/env";
import { AppError } from "../lib/AppError";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches default JWT_EXPIRES_IN
const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // just long enough to complete the Google redirect round-trip

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    // Frontend and backend are deployed on different domains (Vercel/Railway),
    // so the cookie needs SameSite=None to survive cross-site requests. Lax
    // works fine for local dev where both run on localhost.
    sameSite: isProduction ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export async function signup(req: Request, res: Response) {
  const user = await authService.signup(req.body);
  const token = authService.issueToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(req.body);
  const token = authService.issueToken(user);
  setAuthCookie(res, token);
  res.status(200).json({ user });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.status(200).json({ success: true });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  const user = await authService.getUserById(req.user.id);
  res.status(200).json({ user });
}

// Kicks off the redirect-based OAuth flow. The state value is CSRF
// protection: it's stashed in a short-lived cookie here and checked against
// what Google echoes back in googleCallback, so a forged callback request
// (without ever having gone through this step) can't succeed.
export function googleStart(_req: Request, res: Response) {
  if (!googleAuthService.isGoogleConfigured()) {
    throw AppError.badRequest(
      "Google sign-in is not configured on the server",
      "GOOGLE_AUTH_NOT_CONFIGURED"
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: "/",
  });
  res.redirect(googleAuthService.buildGoogleAuthUrl(state));
}

// This is a full-page browser redirect landing here, not an API call from
// our own frontend JS - errors redirect back to /login with a query param
// instead of returning JSON, since there's no client-side code here to
// catch a JSON error response.
export async function googleCallback(req: Request, res: Response) {
  const loginErrorUrl = (reason: string) => `${env.frontendOrigin}/login?error=${reason}`;

  const { code, state } = req.query as { code?: string; state?: string };
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(loginErrorUrl("google_auth_failed"));
  }

  try {
    const profile = await googleAuthService.exchangeCodeForProfile(code);
    const user = await authService.findOrCreateGoogleUser(profile);
    const token = authService.issueToken(user);
    setAuthCookie(res, token);
    res.redirect(`${env.frontendOrigin}/dashboard`);
  } catch (err) {
    console.error("[auth] google callback failed", err);
    res.redirect(loginErrorUrl("google_auth_failed"));
  }
}
