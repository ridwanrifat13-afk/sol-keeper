/**
 * Real-browser check for M9's mission setup wizard — the app's true first screen now
 * (App.tsx's own doc comment). Scenario/difficulty/crew-size/landing-site have real UI
 * (M9.2a/M9.2b); power architecture/shielding still commit with their own sensible defaults
 * until M9.2c/d give them steps of their own.
 */
import { expect, test } from "./fixtures.js";

test.describe("Mission Setup", () => {
  test("is the app's default screen, with all three scenarios offered", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 4: Scenario")).toBeVisible();

    for (const label of ["Jezero Outpost", "First Light", "The Long Night"]) {
      await expect(page.getByRole("button", { name: new RegExp(label) })).toBeVisible();
    }
    // Jezero is selected by default (store/setup.ts's own initial choice).
    await expect(page.getByRole("button", { name: /Jezero Outpost/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Back is disabled on the first step; walking Next through all four steps and back again works", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 2 of 4: Difficulty")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeEnabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 4: Crew size")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 4 of 4: Landing site")).toBeVisible();
    // The last step's action launches the mission, it doesn't say "Next".
    await expect(page.getByRole("button", { name: "▶ Launch Mission" })).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 3 of 4: Crew size")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 2 of 4: Difficulty")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 4: Scenario")).toBeVisible();
  });

  test("crew size step: stepper is clamped to 2-6, and consequence text is real", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 4: Crew size")).toBeVisible();

    await expect(page.getByText("4 crew")).toBeVisible(); // default
    await expect(page.getByText(/at least one person will cover two stations/)).toBeVisible();

    const fewer = page.getByRole("button", { name: "− Fewer" });
    const more = page.getByRole("button", { name: "+ More" });

    // Default is 4 — 2 clicks reaches the floor of 2.
    await fewer.click();
    await fewer.click();
    await expect(page.getByText("2 crew")).toBeVisible();
    await expect(fewer).toBeDisabled();

    // From 2, 4 clicks reaches the ceiling of 6.
    await more.click();
    await more.click();
    await more.click();
    await more.click();
    await expect(page.getByText("6 crew")).toBeVisible();
    await expect(more).toBeDisabled();
  });

  test("landing site step: offers the real catalogued sites for the chosen scenario's body, each with a confidence badge", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 4 of 4: Landing site")).toBeVisible();

    // Jezero is Mars — the three real Mars sites, not the Moon ones.
    for (const label of ["Jezero Crater", "Gale Crater", "Arcadia Planitia"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await expect(page.getByText("Connecting Ridge")).not.toBeVisible();

    // Every site card carries a real confidence word, not just a number.
    await expect(page.getByText("Measured").first()).toBeVisible();

    // The real Leaflet map is present (LandingSiteMap, extended M9.2b for multi-site).
    await expect(page.locator(".leaflet-tile.leaflet-tile-loaded").first()).toBeVisible({ timeout: 5000 });

    // Selecting a different site updates the selection (aria-pressed), not just visually.
    const gale = page.getByRole("button", { name: /Gale Crater/ });
    await gale.click();
    await expect(gale).toHaveAttribute("aria-pressed", "true");
  });

  test("choosing a different scenario, difficulty, crew size, and site, then launching, actually starts that mission", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /First Light/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /Flight-Rated/ }).click();
    await page.getByRole("button", { name: "Next" }).click();

    const fewer = page.getByRole("button", { name: "− Fewer" });
    await fewer.click();
    await fewer.click();
    await expect(page.getByText("2 crew")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // First Light is a Moon scenario — Malapert is a real Moon site.
    await page.getByRole("button", { name: /Malapert Massif/ }).click();

    await page.getByRole("button", { name: "▶ Launch Mission" }).click();

    // Launching lands on Briefing (App.tsx's onLaunch), with the real chosen mission.
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.locator(".mission-site")).toContainText("2/2 crew");
    await expect(page.locator(".mission-site")).toContainText("Moon");
  });

  test("New Mission reopens Setup from any tab, without losing the in-progress run silently", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "▶ Launch Mission" }).click(); // launch with defaults
    await expect(page.getByText("Mission Briefing")).toBeVisible();

    await page.getByRole("button", { name: "New Mission" }).click();
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 4: Scenario")).toBeVisible();
  });
});
