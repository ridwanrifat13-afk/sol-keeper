/**
 * Real-browser check for the Mission Briefing screen (M8.6), which absorbed the old Landing
 * Site tab's map wholesale. Leaflet's own module touches `window` on load
 * (components/LandingSiteMap.tsx's own note), so it's a dynamic import that never runs
 * during the Vitest render tests — this is the only place that actually proves the map
 * widget itself (not just the surrounding text) comes up and requests real tiles from
 * trek.nasa.gov.
 */
import { expect, gotoApp, skipSetup, test } from "./fixtures.js";

test.describe("Mission Briefing", () => {
  test("reachable straight from Setup, with a real Leaflet map requesting actual Trek tiles for Jezero", async ({
    page,
  }) => {
    const tileRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("trek.nasa.gov")) tileRequests.push(req.url());
    });

    await gotoApp(page);
    await skipSetup(page);
    await expect(page.getByText("Mission Briefing")).toBeVisible();
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

    await gotoApp(page);
    await page.getByRole("button", { name: "Mission Command" }).click();
    await page.getByRole("button", { name: /^First Light/ }).click();
    await page.getByRole("button", { name: "Briefing" }).click();
    await expect(page.getByText("Shackleton Ridge", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".leaflet-tile.leaflet-tile-loaded").first()).toBeVisible({ timeout: 5000 });

    await expect
      .poll(() => tileRequests.some((u) => u.includes("LRO_WAC_Mosaic_Global_303ppd_v02")), { timeout: 5000 })
      .toBe(true);
  });

  test("shows real crew, goals, and failure-outcome content, not placeholders", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page);

    await expect(page.getByText("Crew", { exact: true })).toBeVisible();
    await expect(page.getByText("Ayesha")).toBeVisible();

    await expect(page.getByText("What to expect")).toBeVisible();
    await expect(page.getByText(/dust storm/)).toBeVisible();

    await expect(page.getByText("Primary goal:")).toBeVisible();
    await expect(page.getByText("Stretch goal:")).toBeVisible();

    await expect(page.getByText("What failure looks like")).toBeVisible();
    await expect(page.getByText("Packed mass")).toBeVisible();
  });

  test("its real map-tile images are Trek imagery only, no NASA logo or insignia (brief rule 5)", async ({
    page,
  }) => {
    await gotoApp(page);
    await skipSetup(page);
    await expect(page.locator(".leaflet-tile.leaflet-tile-loaded").first()).toBeVisible({ timeout: 5000 });

    // Every <img> on this screen must be one of Leaflet's own real Trek map tiles — not a
    // NASA logo/insignia asset, which this project never ships (brief rule 5 is about the
    // brand mark, not NASA's own scientific imagery, which crediting it is the whole point
    // of this screen).
    const srcs = await page.locator("img").evaluateAll((els) => els.map((el) => el.getAttribute("src") ?? ""));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src).toMatch(/trek\.nasa\.gov/);
    }
    await expect(page.getByText("Not affiliated with or endorsed by NASA")).toBeVisible();
  });

  test("cadet level swaps in icon-led, shorter briefing text", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page);
    await page.getByRole("button", { name: /^Cadet/ }).click();

    await expect(page.getByText(/⚠️/)).toBeVisible();
    await expect(page.getByText(/📦/)).toBeVisible();
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await skipSetup(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath("briefing.png"), fullPage: true });
  });
});
