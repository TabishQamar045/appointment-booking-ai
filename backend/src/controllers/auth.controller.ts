import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AUTH_COOKIE_NAME } from "../middleware/auth";
import { isProduction } from "../config/env";
import { AppError } from "../lib/AppError";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches default JWT_EXPIRES_IN

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
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
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.status(200).json({ success: true });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  const user = await authService.getUserById(req.user.id);
  res.status(200).json({ user });
}
