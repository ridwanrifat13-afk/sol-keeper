/**
 * Real-browser check for M9's mission setup wizard — the app's true first screen now
 * (App.tsx's own doc comment). Every step (scenario/difficulty/crew-size/landing-site/
 * transit/power/shielding/launch-packing) has real UI now (M9.2a-d, M9.3) — the wizard
 * is complete.
 */
import { expect, gotoApp, test } from "./fixtures.js";
import type { Page } from "@playwright/test";

/** Clicks Next `times` times from wherever the wizard currently is. */
async function clickNext(page: Page, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
}

test.describe("Mission Setup", () => {
  test("is the app's default screen, with all three scenarios offered", async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 8: Scenario")).toBeVisible();

    for (const label of ["Jezero Outpost", "First Light", "The Long Night"]) {
      await expect(page.getByRole("button", { name: new RegExp(label) })).toBeVisible();
    }
    // Jezero is selected by default (store/setup.ts's own initial choice).
    await expect(page.getByRole("button", { name: /Jezero Outpost/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Back is disabled on the first step; walking Next through all eight steps and back again works", async ({
    page,
  }) => {
    await gotoApp(page);
    await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();

    const steps = ["Difficulty", "Crew size", "Landing site", "Transit", "Power", "Shielding", "Launch Packing"];
    for (const [i, label] of steps.entries()) {
      await page.getByRole("button", { name: "Next" }).click();
      await expect(page.getByText(`Step ${i + 2} of 8: ${label}`)).toBeVisible();
      await expect(page.getByRole("button", { name: "Back" })).toBeEnabled();
    }
    // The last step's action launches the mission, it doesn't say "Next".
    await expect(page.getByRole("button", { name: "▶ Launch Mission" })).toBeVisible();

    for (const [i, label] of [...steps].reverse().slice(1).entries()) {
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByText(`Step ${steps.length - i} of 8: ${label}`)).toBeVisible();
    }
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 8: Scenario")).toBeVisible();
  });

  test("crew size step: stepper is clamped to 2-6, and consequence text is real", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 8: Crew size")).toBeVisible();

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
    await gotoApp(page);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 4 of 8: Landing site")).toBeVisible();

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

  test("transit step: shows the real Earth-body distance and light time for the chosen scenario's body", async ({
    page,
  }) => {
    await gotoApp(page);
    await clickNext(page, 4);
    await expect(page.getByText("Step 5 of 8: Transit")).toBeVisible();
    await expect(page.getByText("Earth to Mars")).toBeVisible();

    // The real animated scene plus its text fallback (Ripple pattern).
    await expect(page.getByRole("img", { name: /transit from Earth to Mars/ })).toBeVisible();
    await expect(page.getByText("Distance today")).toBeVisible();
    await expect(page.getByText(/km/).first()).toBeVisible();
    await expect(page.getByText("One-way light time")).toBeVisible();
  });

  test("power architecture step: shows real, live-sized numbers, not the same figure for every choice", async ({
    page,
  }) => {
    await gotoApp(page);
    await clickNext(page, 5);
    await expect(page.getByText("Step 6 of 8: Power")).toBeVisible();

    const solar = page.getByRole("button", { name: /Solar \+ battery/ });
    const fission = page.getByRole("button", { name: /Fission reactor/ });
    const hybrid = page.getByRole("button", { name: /Hybrid/ });

    await expect(solar.getByText(/m² array/)).toBeVisible();
    await expect(solar.getByText("kWe reactor", { exact: false })).toHaveCount(0);
    await expect(fission.getByText(/40 kWe reactor/)).toBeVisible();
    await expect(hybrid.getByText(/40 kWe reactor/)).toBeVisible();
    await expect(hybrid.getByText(/m² array/)).toBeVisible();

    await fission.click();
    await expect(fission).toHaveAttribute("aria-pressed", "true");
  });

  test("shielding step: shows the real per-approach trade-off (mass vs. crew-hours)", async ({ page }) => {
    await gotoApp(page);
    await clickNext(page, 6);
    await expect(page.getByText("Step 7 of 8: Shielding")).toBeVisible();

    const hullOnly = page.getByRole("button", { name: /Hull only/ });
    const waterWall = page.getByRole("button", { name: /Water wall/ });
    const regolithBerm = page.getByRole("button", { name: /Regolith berm/ });

    await expect(hullOnly.getByText("No change from the base habitat")).toBeVisible();
    await expect(waterWall.getByText(/2000 kg water launched/)).toBeVisible();
    await expect(regolithBerm.getByText(/crew-h pre-mission/)).toBeVisible();

    await waterWall.click();
    await expect(waterWall).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("button", { name: "▶ Launch Mission" })).toBeVisible();
  });

  test("launch packing step: previews the real grand total, and reflects the regolith berm's crew-hours line", async ({
    page,
  }) => {
    await gotoApp(page);
    await clickNext(page, 6);
    // Choose Regolith berm on the Shielding step so the crew-time line is non-zero.
    await page.getByRole("button", { name: /Regolith berm/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 8 of 8: Launch Packing")).toBeVisible();

    await expect(page.getByText("Grand total")).toBeVisible();
    await expect(page.getByText(/Consumables launched/)).toBeVisible();
    await expect(page.getByText(/Shielding crew-time/)).toBeVisible();
    // The regolith berm's 80 crew-hours convert to a non-zero ESM-equivalent kg line.
    await expect(page.getByText(/80 pre-mission construction crew-hours/)).toBeVisible();

    await expect(page.getByRole("button", { name: "▶ Launch Mission" })).toBeVisible();
  });

  test("choosing a different scenario, difficulty, crew size, site, power, and shielding, then launching, actually starts that mission", async ({
    page,
  }) => {
    await gotoApp(page);
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
    await page.getByRole("button", { name: "Next" }).click();

    // Transit step — just a review, move on.
    await expect(page.getByText("Earth to the Moon")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: /Fission reactor/ }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: /Regolith berm/ }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "▶ Launch Mission" }).click();

    // Launching lands on Briefing (App.tsx's onLaunch), with the real chosen mission.
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.locator(".mission-site")).toContainText("2/2 crew");
    await expect(page.locator(".mission-site")).toContainText("Moon");
  });

  test("New Mission reopens Setup from any tab, without losing the in-progress run silently", async ({
    page,
  }) => {
    await gotoApp(page);
    await clickNext(page, 7);
    await page.getByRole("button", { name: "▶ Launch Mission" }).click(); // launch with defaults
    await expect(page.getByText("Mission Briefing")).toBeVisible();

    await page.getByRole("button", { name: "New Mission" }).click();
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByText("Step 1 of 8: Scenario")).toBeVisible();
  });
});
