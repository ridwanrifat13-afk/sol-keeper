/**
 * Brief rule 6: "must run on a low-end Android phone and work offline after first load."
 * This is the one behaviour that's meaningless to check any other way — a service worker
 * only exists in a real browser, and "does it actually work with the network cut" can only
 * be answered by actually cutting the network.
 */
import { expect, test } from "@playwright/test";

test.describe("Offline (PWA)", () => {
  test("the app shell still renders after the network is cut, once the service worker has installed", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Sol Keeper")).toBeVisible();

    // Wait for the service worker to actually finish installing and take control — the
    // very first load is served with no SW involved at all, so a reload is required for
    // "offline after first load" to mean anything.
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect(page.getByText("Sol Keeper")).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("Sol Keeper")).toBeVisible();
    // The Life Support console's own data comes from the sim running in the browser, not a
    // network call, so a real resource gauge rendering confirms this isn't just a cached
    // blank shell — the whole app is functional with the network off.
    await page.getByRole("button", { name: "Life Support" }).click();
    await expect(page.locator(".gauge-label", { hasText: "Oxygen" })).toBeVisible();

    await context.setOffline(false);
  });
});
