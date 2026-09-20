/**
 * Real-browser check for Live Sky. `vite preview` (what this suite runs against) serves
 * only the static build, not the Vercel Functions under apps/web/api/ — so every /api/*
 * call here genuinely 404s, which is exactly the "live failed" path a player would hit
 * offline or on a bad connection. That makes this an honest test of the fallback behaviour
 * that matters most for a PWA, even though it can't reach the "live succeeded" branch
 * (that would need `vercel dev`, a separate manual check the lead developer can run).
 */
import { expect, test } from "@playwright/test";

test.describe("Live Sky", () => {
  test("falls back to the real committed snapshot when /api is unavailable, and says so", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Live Sky" }).click();

    await expect(page.locator("h1")).toHaveText("Live Sky");

    // The distance panel: /api/light-time 404s here, so it must settle on the snapshot
    // within the 3 s upgrade window and label itself accordingly, not hang on "Loading…".
    const distanceBadge = page.locator(".panel-head-row:has(#light-time-heading) .provenance-badge");
    await expect(distanceBadge).toHaveText(/Snapshot/, { timeout: 5000 });
    await expect(page.getByText(/km from Earth to (Mars|the Moon) right now/)).toBeVisible();

    // The space-weather panel: the committed snapshot is the real May 2024 storm window,
    // which is never empty, so this always reads "Snapshot" here (not "Historical event" —
    // that label is reserved for when /api genuinely answers with zero events, which
    // requires a working /api to observe at all).
    const weatherBadge = page.locator(".panel-head-row:has(#space-weather-heading) .provenance-badge");
    await expect(weatherBadge).toHaveText(/Snapshot/, { timeout: 5000 });
    await expect(page.locator(".live-sky-event").first()).toBeVisible();
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Live Sky" }).click();
    await page.waitForTimeout(3500); // let the failed live fetch time out and settle
    await page.screenshot({ path: testInfo.outputPath("live-sky.png"), fullPage: true });
  });
});
