import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/AppError";

export const AUTH_COOKIE_NAME = "auth_token";

interface JwtPayload {
  sub: string;
  email: string;
  role: "customer" | "admin";
}

// Verifies the httpOnly auth cookie and attaches `req.user`. Any route
// registered after this in the router chain can assume `req.user` exists.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    throw AppError.unauthorized("Not authenticated");
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired session");
  }
}

// Must run after requireAuth. Kept separate rather than folded into
// requireAuth so public-but-authenticated routes don't pay an admin check.
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    throw AppError.forbidden("Admin access required");
  }
  next();
}
