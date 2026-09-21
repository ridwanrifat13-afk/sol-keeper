/**
 * Real-browser check for the Trek map. Leaflet's own module touches `window` on load (see
 * the note on LandingSiteView.tsx), so it's a dynamic import that never runs during the
 * Vitest render tests — this is the only place that actually proves the map widget itself
 * (not just the surrounding text) comes up and requests real tiles from trek.nasa.gov.
 */
import { expect, test } from "@playwright/test";

test.describe("Landing Site", () => {
  test("renders a real Leaflet map and requests actual Trek tiles for Jezero", async ({ page }) => {
    const tileRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("trek.nasa.gov")) tileRequests.push(req.url());
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Landing Site" }).click();
    await expect(page.locator("h1")).toHaveText("Landing Site");
    await expect(page.getByText("Jezero Crater", { exact: false }).first()).toBeVisible();

    // Leaflet's own tile/zoom-control markup, proving the widget actually initialised.
    // (.leaflet-tile-pane itself is a zero-size transform anchor Leaflet positions tiles
    // relative to — Playwright correctly reports it as not "visible" even when its tile
    // children are; a loaded tile <img> is the real signal that something is on screen.)
    await expect(page.locator(".leaflet-tile.leaflet-tile-loaded").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".leaflet-control-zoom")).toBeVisible();

    await expect
      .poll(() => tileRequests.length, { timeout: 5000, message: "expected at least one trek.nasa.gov tile request" })
      .toBeGreaterThan(0);
    expect(tileRequests.some((u) => u.includes("Mars_Viking_MDIM21_ClrMosaic_global_232m"))).toBe(true);
  });

  test("switching to a Moon scenario swaps in the Moon Trek layer", async ({ page }) => {
    const tileRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("trek.nasa.gov")) tileRequests.push(req.url());
    });

    await page.goto("/");
    await page.getByRole("button", { name: /^First Light/ }).click();
    await page.getByRole("button", { name: "Landing Site" }).click();
    await expect(page.getByText("Shackleton Ridge", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".leaflet-tile.leaflet-tile-loaded").first()).toBeVisible({ timeout: 5000 });

    await expect
      .poll(() => tileRequests.some((u) => u.includes("LRO_WAC_Mosaic_Global_303ppd_v02")), { timeout: 5000 })
      .toBe(true);
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Landing Site" }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath("landing-site.png"), fullPage: true });
  });
});
