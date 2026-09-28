import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Minimal request logger - console.log is fine per the assessment's scope.
// Silenced under test: every API test creates an app instance and fires
// several requests, and this line per request drowns out actual test output
// for no benefit (a failing assertion already says which request failed).
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (env.nodeEnv === "test") return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
}
