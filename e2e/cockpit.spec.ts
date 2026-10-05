/**
 * Real-browser checks for the cockpit view mechanism (M9.1). Vitest/SSR
 * (apps/web/tests/render.test.tsx, apps/web/tests/cockpit.test.ts) cover the pure assignment
 * logic and that the component tree assembles; this is for what only a real browser can show.
 *
 * All ten station photos now exist (apps/web/public/stations/), but none has a calibrated
 * screen map yet — screenMaps.ts is deliberately empty (the earlier placeholder entry was
 * removed once a real photo replaced the placeholder it was calibrated against; see that
 * file's own doc comment). `StationCockpit` falls back to Classic whenever
 * `getScreenMap(body, station)` returns `undefined`, so every station renders Classic-only
 * right now — that is the real, current, correct behaviour this file tests, not a gap to work
 * around. Once the lead developer calibrates a station with `/cockpit-calibrate` and adds its
 * entry to screenMaps.ts, add a cockpit-rendering test for that station alongside these.
 */
import { expect, gotoApp, openTab, test } from "./fixtures.js";
import type { Page } from "@playwright/test";

const STATIONS: readonly { tab: string; heading: string }[] = [
  { tab: "Power", heading: "Power" },
  { tab: "Life Support", heading: "Life Support" },
  { tab: "Comms", heading: "Comms" },
  { tab: "Incident Command", heading: "Incident Command" },
  { tab: "Mission Command", heading: "Mission Command" },
];

async function gotoMoonLifeSupport(page: Page): Promise<void> {
  await gotoApp(page);
  await openTab(page, "Mission Command");
  await page.getByRole("button", { name: /^First Light/ }).click();
  await openTab(page, "Life Support");
}

/**
 * Advances the clock sol by sol, stopping the instant a Decision Card appears instead of
 * auto-answering it like operate.spec.ts/dial.spec.ts's own helpers do (they exist to get
 * *past* every card as fast as possible; this test needs one left on screen to inspect).
 * store/run.ts's DEFAULT_PARAMS.seed is fixed at 1, so which sol this lands on is
 * deterministic, not flaky — the cap is generous headroom above First Light's own 31-sol
 * duration.
 */
async function advanceUntilDecisionCard(page: Page, maxSols = 40): Promise<boolean> {
  // First Light is a Moon scenario — TimeControls.tsx labels this button "+1 day" there,
  // "+1 sol" only on Mars.
  const solButton = page.getByRole("button", { name: "+1 day" });
  const runSolButton = page.getByRole("button", { name: "Run the sol" });
  const continueButton = page.getByRole("button", { name: "Continue to Sol Planning" });
  for (let i = 0; i < maxSols; i++) {
    if ((await page.locator(".decision-card-response").count()) > 0) return true;
    if ((await continueButton.count()) > 0) {
      await continueButton.click();
    }
    if ((await runSolButton.count()) > 0) {
      await runSolButton.click();
    }
    if (await solButton.isDisabled()) break;
    await solButton.click();
  }
  return (await page.locator(".decision-card-response").count()) > 0;
}

test.describe("Cockpit view — uncalibrated stations fall back to Classic", () => {
  for (const { tab, heading } of STATIONS) {
    test(`${tab}: renders Classic (no cockpit chrome, no screen map yet)`, async ({ page }) => {
      await gotoApp(page);
      await openTab(page, "Mission Command");
      await page.getByRole("button", { name: /^First Light/ }).click();
      await openTab(page, tab);

      // StationCockpit.tsx: the Cockpit/Classic toggle itself only renders once a screen map
      // exists — its absence here is the real, current signal, not just an absence of chrome.
      await expect(page.getByRole("button", { name: "Cockpit", exact: true })).toHaveCount(0);
      await expect(page.locator(".cockpit-frame")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
    });
  }
});

test.describe("Decision Card", () => {
  test("overlays the whole screen and resolves normally (Life Support, Classic)", async ({
    page,
  }) => {
    await gotoMoonLifeSupport(page);
    const found = await advanceUntilDecisionCard(page);
    expect(found).toBe(true);

    const overlay = page.locator(".decision-card-overlay");
    await expect(overlay).toBeVisible();

    await page.locator(".decision-card-response").first().click();
    await expect(overlay).toHaveCount(0);
  });
});
