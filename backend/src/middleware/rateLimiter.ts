import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// Basic rate limiting per the assessment's scope ("advanced rate limiting"
// is explicitly cut) - a single sensible global limit plus a tighter one for
// auth endpoints to blunt credential-stuffing/brute-force attempts.
//
// Skipped under NODE_ENV=test: the test suite signs up/logs in a fresh user
// per test from what express-rate-limit sees as a single IP, which would
// otherwise trip the 15-minute auth window within one run and fail tests
// for a reason that has nothing to do with what they're checking.
const skipInTests = () => env.nodeEnv === "test";

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
  skip: skipInTests,
});
