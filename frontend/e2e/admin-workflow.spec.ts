import { test, expect } from "@playwright/test";
import { signup, login, randomEmail, futureOpenDateStr } from "./helpers";

async function bookViaForm(page: import("@playwright/test").Page, serviceName: string, date: string) {
  await page.click('button:has-text("Book directly")');
  await page.locator("#service").click();
  await page.getByRole("option", { name: new RegExp(serviceName) }).click();
  await page.fill("#date", date);
  await expect(page.getByRole("button", { name: "09:00" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "09:00" }).click();
  await page.click('button:has-text("Book appointment")');
}

test("admin confirms a customer's booking, and the customer is notified", async ({ browser }) => {
  const customerContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  const adminPage = await adminContext.newPage();

  const email = randomEmail("confirm-flow");
  await signup(customerPage, { name: "Confirm Flow Customer", email });
  const date = futureOpenDateStr(12); // distinct day - see helpers.ts

  await bookViaForm(customerPage, "Hair Coloring", date);
  await expect(customerPage.getByText("Hair Coloring").first()).toBeVisible();

  await login(adminPage, "admin@glowstudio.com");
  await adminPage.waitForURL("**/admin**");

  // Find the specific card for this customer's booking - the admin list has
  // every appointment from every test that's run, so matching on the
  // customer's unique email (not just service name) is what makes this
  // deterministic under full parallelism. data-slot="card" (see
  // components/ui/card.tsx) scopes to exactly one repeating card unit,
  // not an arbitrary ancestor/descendant div that may or may not also
  // contain the Confirm/Cancel buttons.
  const card = adminPage.locator('[data-slot="card"]').filter({ hasText: email });
  await card.getByRole("button", { name: "Confirm" }).click();
  await expect(card.getByText("confirmed")).toBeVisible();

  // The customer sees the status change and gets a real notification about it.
  await customerPage.reload();
  await expect(customerPage.getByText("confirmed").first()).toBeVisible();
  await customerPage.locator('button:has(svg.lucide-bell)').click();
  await expect(customerPage.getByText(/confirmed/i).first()).toBeVisible();
});

test("admin cancels with a reason, and the customer sees the reason (not a native alert box)", async ({
  browser,
}) => {
  const customerContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  const adminPage = await adminContext.newPage();

  let nativeDialogFired = false;
  adminPage.on("dialog", async (dialog) => {
    nativeDialogFired = true;
    await dialog.dismiss();
  });

  const email = randomEmail("cancel-flow");
  await signup(customerPage, { name: "Cancel Flow Customer", email });
  const date = futureOpenDateStr(13); // distinct day - see helpers.ts

  await bookViaForm(customerPage, "Massage Therapy", date);
  await expect(customerPage.getByText("Massage Therapy").first()).toBeVisible();

  await login(adminPage, "admin@glowstudio.com");
  await adminPage.waitForURL("**/admin**");

  const card = adminPage.locator('[data-slot="card"]').filter({ hasText: email });
  await card.getByRole("button", { name: "Cancel" }).click();

  // The reason has to go through the in-app modal, not window.prompt().
  await expect(adminPage.getByText("Cancel appointment")).toBeVisible();
  await adminPage.fill("#cancel-reason", "Stylist called in sick");
  await adminPage.click('button:has-text("Confirm cancellation")');
  await expect(card.getByText("cancelled")).toBeVisible();
  expect(nativeDialogFired).toBe(false);

  await customerPage.reload();
  await expect(customerPage.getByText("Reason: Stylist called in sick")).toBeVisible();

  await customerPage.locator('button:has(svg.lucide-bell)').click();
  await expect(customerPage.getByText(/Stylist called in sick/i).first()).toBeVisible();
});
