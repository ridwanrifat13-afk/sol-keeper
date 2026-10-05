/**
 * Real-browser checks for the Life Support cockpit view (M9.1 step 3). Vitest/SSR
 * (apps/web/tests/render.test.tsx, apps/web/tests/cockpit.test.ts) cover the pure assignment
 * logic and that the component tree assembles; this is for what only a real browser can show:
 * that CockpitTarget's portals actually land existing panels inside the station photo's screen
 * regions, that the global Decision Card overlay still sits above the cockpit frame rather than
 * being confined to a small region (M9.1's own hard rule), and that every documented fallback
 * path (narrow viewport, failed image load) really does hand back a fully usable Classic view.
 */
import { expect, gotoApp, openTab, test } from "./fixtures.js";
import type { Page } from "@playwright/test";

/** First Light is the one scenario with a calibrated (placeholder) screen map today. */
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

test.describe("Cockpit view — Moon Life Support", () => {
  test("renders the console's own panels inside the station photo's screen regions", async ({
    page,
  }) => {
    await gotoMoonLifeSupport(page);

    await expect(page.locator(".cockpit-frame")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cockpit", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // The primary region's panel (promoted so the main screen isn't empty — StationCockpit.tsx's
    // own note) really is portaled into a screen's content node, not just present on the page.
    const primaryScreen = page
      .locator(".cockpit-screen-content")
      .filter({ has: page.getByRole("heading", { name: "Air cleaner (CO₂ scrubber)" }) });
    await expect(primaryScreen).toBeVisible();
  });

  test("Classic toggle shows the console directly, and the preference persists across reload", async ({
    page,
  }) => {
    await gotoMoonLifeSupport(page);
    await page.getByRole("button", { name: "Classic", exact: true }).click();

    await expect(page.locator(".cockpit-frame")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Air cleaner (CO₂ scrubber)" })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Launch Outpost" }).click();
    await gotoMoonLifeSupport(page);
    await expect(page.getByRole("button", { name: "Classic", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".cockpit-frame")).toHaveCount(0);
  });

  test("an active Decision Card overlays the whole screen, above the cockpit frame, and resolves normally", async ({
    page,
  }) => {
    await gotoMoonLifeSupport(page);
    const found = await advanceUntilDecisionCard(page);
    expect(found).toBe(true);

    const overlay = page.locator(".decision-card-overlay");
    await expect(overlay).toBeVisible();
    // M9.1's own hard rule: a Decision Card must never be confined to a small screen region.
    // It's a sibling of StationCockpit in App.tsx, not a portaled panel, so this should already
    // hold — assert it directly rather than trust the wiring.
    expect(await overlay.evaluate((el) => el.closest(".cockpit-frame"))).toBeNull();

    await page.locator(".decision-card-response").first().click();
    await expect(overlay).toHaveCount(0);
  });

  test("falls back to Classic below the cockpit breakpoint", async ({ page }) => {
    // Starts wide (Cockpit is on by default there), then narrows live — rather than loading
    // narrow from the start, which takes the *default-to-Classic-on-first-visit* path instead
    // (useCockpitMode.ts) and never exercises the "player wants Cockpit but can't have it
    // right now" fallback-note branch this test is actually about.
    await gotoMoonLifeSupport(page);
    await expect(page.locator(".cockpit-frame")).toBeVisible();

    await page.setViewportSize({ width: 800, height: 900 });
    await expect(page.getByText("Cockpit view needs a wider screen (1024px+).")).toBeVisible();
    await expect(page.locator(".cockpit-frame")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Air cleaner (CO₂ scrubber)" })).toBeVisible();
  });

  test("falls back to Classic, fully usable, when the station photo fails to load", async ({
    page,
  }) => {
    // Matches every generated width/format variant (scripts/generate-station-images.ts),
    // not just one filename — a real failure (network, CDN, ad blocker) would block the
    // whole <picture> negotiation, not one specific file.
    await page.route("**/stations/moon-lifeSupport*", (route) => route.abort());
    await gotoMoonLifeSupport(page);

    await expect(page.getByText("The station photo failed to load.")).toBeVisible();
    await expect(page.locator(".cockpit-frame")).toHaveCount(0);

    // Not just rendered — actually operable, the same as it would be in Classic normally.
    const balancedButton = page.getByRole("button", { name: /^Balanced/ });
    await balancedButton.click();
    await expect(balancedButton).toHaveAttribute("aria-pressed", "true");
  });
});
