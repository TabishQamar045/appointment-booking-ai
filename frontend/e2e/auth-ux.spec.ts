import { test, expect } from "@playwright/test";

test.describe("login page", () => {
  test("has placeholders, a Google button, and no leftover seeded-account hint text", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page.locator("#email")).toHaveAttribute("placeholder", "you@example.com");
    await expect(page.locator("#password")).toHaveAttribute("placeholder", "••••••••");
    await expect(page.getByText("Continue with Google")).toBeVisible();

    // Regression check for a specific, previously-shipped piece of copy the
    // user asked removed for looking unprofessional.
    await expect(page.getByText(/seeded account/i)).toHaveCount(0);
  });
});

// Regression test for a real bug hit this session: a stale/invalid auth
// cookie used to bounce forever between /dashboard (kicked out because
// /auth/me 401s) and /login (bounced right back because proxy.ts sees *a*
// cookie present, without being able to check if it's valid). The fix was
// calling logout() - which clears the cookie server-side - instead of a
// plain client-side redirect.
test("a garbage auth cookie lands cleanly on /login instead of looping", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "auth_token",
      value: "this-is-not-a-real-jwt",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.waitForURL("**/login**", { timeout: 10_000 });

  // If it were looping, the URL would keep flipping - give it a beat and
  // confirm it actually settled on /login rather than bouncing again.
  await page.waitForTimeout(1500);
  expect(page.url()).toContain("/login");

  const cookies = await context.cookies();
  const authCookie = cookies.find((c) => c.name === "auth_token");
  expect(authCookie).toBeUndefined();
});
