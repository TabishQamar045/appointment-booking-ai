import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/AppError";

export const AUTH_COOKIE_NAME = "auth_token";

interface JwtPayload {
  sub: string;
  email: string;
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
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired session");
  }
}
