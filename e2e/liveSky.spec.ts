/**
 * Real-browser check for the space-weather content on Power and the light-time content on
 * Comms (M8.3: both folded in from the old Live Sky tab — see App.tsx's own doc comment).
 * `vite preview` (what this suite runs against) serves only the static build, not the Vercel
 * Functions under apps/web/api/ — so every /api/* call here genuinely 404s, which is exactly
 * the "live failed" path a player would hit offline or on a bad connection. That makes this
 * an honest test of the fallback behaviour that matters most for a PWA, even though it can't
 * reach the "live succeeded" branch (that would need `vercel dev`, a separate manual check
 * the lead developer can run).
 */
import { expect, gotoApp, openTab, test } from "./fixtures.js";

test.describe("Comms console", () => {
  test("falls back to the real committed snapshot when /api is unavailable, and says so", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Comms");

    await expect(page.getByRole("heading", { level: 2, name: "Comms" })).toBeVisible();

    // /api/light-time 404s here, so it must settle on the snapshot within the 3 s upgrade
    // window and label itself accordingly, not hang on "Loading…".
    const distanceBadge = page.locator(".panel-head-row:has(#light-time-heading) .provenance-badge");
    await expect(distanceBadge).toHaveText(/Snapshot/, { timeout: 5000 });
    await expect(page.getByText(/km from Earth to (Mars|the Moon) right now/)).toBeVisible();
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await openTab(page, "Comms");
    await page.waitForTimeout(3500); // let the failed live fetch time out and settle
    await page.screenshot({ path: testInfo.outputPath("comms-console.png"), fullPage: true });
  });

  test("downlink priority defaults to science and is locked to Sol Planning", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Comms");

    const science = page.getByRole("button", { name: "Science downlink", exact: false });
    const personal = page.getByRole("button", { name: "Personal correspondence", exact: false });
    await expect(science).toHaveAttribute("aria-pressed", "true");
    await expect(personal).toBeEnabled();

    await personal.click();
    await expect(personal).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Run the sol" }).click();
    await expect(personal).toBeDisabled();
    await expect(page.getByText("Locked while the sol is running")).toBeVisible();
  });
});

test.describe("Power console: space weather", () => {
  test("falls back to the real committed snapshot when /api is unavailable, and says so", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Power");

    // The committed snapshot is the real May 2024 storm window, which is never empty, so
    // this always reads "Snapshot" here (not "Historical event" — that label is reserved
    // for when /api genuinely answers with zero events, which requires a working /api to
    // observe at all).
    const weatherBadge = page.locator(".panel-head-row:has(#space-weather-heading) .provenance-badge");
    await expect(weatherBadge).toHaveText(/Snapshot/, { timeout: 5000 });
    await expect(page.locator(".live-sky-event").first()).toBeVisible();
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await openTab(page, "Power");
    await page.waitForTimeout(3500); // let the failed live fetch time out and settle
    await page.screenshot({ path: testInfo.outputPath("power-console-weather.png"), fullPage: true });
  });
});
