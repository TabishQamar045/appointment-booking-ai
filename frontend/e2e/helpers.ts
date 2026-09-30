import type { Page } from "@playwright/test";

// A random email per call is the isolation strategy for this whole suite -
// every test creates its own customer instead of sharing seeded fixtures, so
// fullyParallel: true (see playwright.config.ts) is safe: no test can ever
// see another test's data.
export function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function signup(page: Page, opts: { name: string; email: string; password?: string }) {
  const password = opts.password ?? "password123";
  await page.goto("/signup", { waitUntil: "networkidle" });
  await page.fill("#name", opts.name);
  await page.fill("#email", opts.email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");
}

export async function login(page: Page, email: string, password = "password123") {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

// A date guaranteed to fall Mon-Sat, matching the seeded business hours
// (Sunday closed) - mirrors backend/tests/helpers/factories.ts's
// futureOpenDateStr so both suites reason about "a real open day" the same
// way.
//
// IMPORTANT: the salon is one shared calendar across every service (see
// availability.service.ts) - a booking for ANY service blocks overlapping
// times for every OTHER service that same day too. Tests run fullyParallel,
// so any two tests that book must land on different actual dates or they'll
// race for the same day's slots and fail intermittently.
//
// This bit CI in practice: two call sites used `daysAhead` of 11 and 12,
// which looked distinct, but the Sunday-skip below can shift a date forward
// by a day - on the date main was tested against, 11 landed on a Sunday and
// rolled forward onto the exact same day 12 already used, and whichever
// test's booking ran first silently blocked the other's. It only showed up
// in CI because it depends on which real calendar day "today" is when the
// suite runs, which local testing on one particular day can't catch.
//
// The fix: space every call site's `daysAhead` at least 10 apart (10, 20,
// 30, ...) - the Sunday-skip only ever shifts a date by up to 1 day, so a
// gap that wide can never collide regardless of what day "today" is.
export function futureOpenDateStr(daysAhead = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
