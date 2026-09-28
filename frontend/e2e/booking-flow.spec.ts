import { test, expect } from "@playwright/test";
import { signup, randomEmail, futureOpenDateStr } from "./helpers";

test("a new customer can sign up and book a real appointment through the form", async ({ page }) => {
  const email = randomEmail("booker");
  await signup(page, { name: "Booking Test", email });

  await page.click('button:has-text("Book directly")');

  await page.locator("#service").click();
  await page.getByRole("option", { name: /Facials/ }).click();

  await page.fill("#date", futureOpenDateStr());
  // Slot buttons only render once availability has loaded for the chosen
  // service+date - the picker showing at all is itself proof the
  // GET /availability round-trip through the proxy worked.
  await expect(page.getByRole("button", { name: "09:00" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "09:00" }).click();

  await page.click('button:has-text("Book appointment")');

  const appointmentCard = page.getByText("Facials").first();
  await expect(appointmentCard).toBeVisible();
  await expect(page.getByText("pending", { exact: true }).first()).toBeVisible();
});

test("a slot someone else just booked disappears from a second customer's picker", async ({
  browser,
}) => {
  // Two independent browser contexts = two independent logged-in customers.
  // The exact race (two simultaneous submits for one slot) is covered
  // deterministically at the API layer instead (backend/tests/api/
  // appointments.test.ts's 409 SLOT_UNAVAILABLE case) - what's worth
  // proving through the real UI is the other half: once a slot is taken,
  // does the picker itself stop offering it, end to end through the actual
  // GET /availability round-trip.
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await signup(pageA, { name: "First Booker", email: randomEmail("conflict-a") });
  await signup(pageB, { name: "Second Booker", email: randomEmail("conflict-b") });

  const date = futureOpenDateStr(11); // distinct day from the test above - shared calendar, see helpers.ts

  await pageA.click('button:has-text("Book directly")');
  await pageA.locator("#service").click();
  await pageA.getByRole("option", { name: /Manicure & Pedicure/ }).click();
  await pageA.fill("#date", date);
  await expect(pageA.getByRole("button", { name: "09:00" })).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole("button", { name: "09:00" }).click();
  await pageA.click('button:has-text("Book appointment")');
  await expect(pageA.getByText("Manicure & Pedicure").first()).toBeVisible();

  await pageB.click('button:has-text("Book directly")');
  await pageB.locator("#service").click();
  await pageB.getByRole("option", { name: /Manicure & Pedicure/ }).click();
  await pageB.fill("#date", date);
  // Manicure & Pedicure is a 60-minute service, so booking 09:00 blocks the
  // whole 09:00-10:00 window (09:00/09:15/09:30/09:45), not just 09:00
  // itself - 10:00 is the first slot genuinely outside that window, and
  // must still be open (proves the picker isn't just broken/empty)...
  await expect(pageB.getByRole("button", { name: "10:00" })).toBeVisible({ timeout: 10_000 });
  // ...while every slot inside the window customer A took must be gone.
  for (const slot of ["09:00", "09:15", "09:30", "09:45"]) {
    await expect(pageB.getByRole("button", { name: slot })).toHaveCount(0);
  }

  await contextA.close();
  await contextB.close();
});
