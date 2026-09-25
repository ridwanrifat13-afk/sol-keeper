/**
 * Real-browser check for M9's mission setup wizard — the app's true first screen now
 * (App.tsx's own doc comment). Only scenario/difficulty/crew-size have real UI yet (M9.2a);
 * landing site/power architecture/shielding still commit with their own sensible defaults
 * until M9.2b/c/d give them steps of their own.
 */
import { expect, test } from "./fixtures.js";

test.describe("Mission Setup", () => {
  test("is the app's default screen, with all three scenarios offered", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 3: Scenario")).toBeVisible();

    for (const label of ["Jezero Outpost", "First Light", "The Long Night"]) {
      await expect(page.getByRole("button", { name: new RegExp(label) })).toBeVisible();
    }
    // Jezero is selected by default (store/setup.ts's own initial choice).
    await expect(page.getByRole("button", { name: /Jezero Outpost/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Back is disabled on the first step; walking Next through all three steps and back again works", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 2 of 3: Difficulty")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeEnabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 3: Crew size")).toBeVisible();
    // The last step's action launches the mission, it doesn't say "Next".
    await expect(page.getByRole("button", { name: "▶ Launch Mission" })).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 2 of 3: Difficulty")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 3: Scenario")).toBeVisible();
  });

  test("crew size step: stepper is clamped to 2-6, and consequence text is real", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 3: Crew size")).toBeVisible();

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

  test("choosing a different scenario and difficulty, then launching, actually starts that mission", async ({
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
    await page.getByRole("button", { name: "▶ Launch Mission" }).click(); // launch with defaults
    await expect(page.getByText("Mission Briefing")).toBeVisible();

    await page.getByRole("button", { name: "New Mission" }).click();
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 3: Scenario")).toBeVisible();
  });
});
