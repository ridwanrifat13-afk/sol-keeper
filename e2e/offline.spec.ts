/**
 * Brief rule 6: "must run on a low-end Android phone and work offline after first load."
 * This is the one behaviour that's meaningless to check any other way — a service worker
 * only exists in a real browser, and "does it actually work with the network cut" can only
 * be answered by actually cutting the network.
 */
import { expect, gotoApp, reloadApp, skipSetup, test } from "./fixtures.js";

test.describe("Offline (PWA)", () => {
  test("the app shell still renders after the network is cut, once the service worker has installed", async ({
    page,
    context,
  }) => {
    await gotoApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();

    // Wait for the service worker to actually finish installing and take control — the
    // very first load is served with no SW involved at all, so a reload is required for
    // "offline after first load" to mean anything.
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
    await reloadApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();

    await context.setOffline(true);
    await reloadApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();
    // The Life Support console's own data comes from the sim running in the browser, not a
    // network call, so a real resource gauge rendering confirms this isn't just a cached
    // blank shell — the whole app (Setup included) is functional with the network off.
    await skipSetup(page, "Life Support");
    await expect(page.locator(".gauge-label", { hasText: "Oxygen" })).toBeVisible();

    await context.setOffline(false);
  });
});
