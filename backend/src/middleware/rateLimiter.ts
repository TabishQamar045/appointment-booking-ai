import rateLimit from "express-rate-limit";

// Basic rate limiting per the assessment's scope ("advanced rate limiting"
// is explicitly cut) - a single sensible global limit plus a tighter one for
// auth endpoints to blunt credential-stuffing/brute-force attempts.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});
