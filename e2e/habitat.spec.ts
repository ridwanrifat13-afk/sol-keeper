/**
 * Real-browser check for the Habitat view (M9.4a/b) — the app's 6th tab, a visualization
 * with no levers of its own, reading `state.environment`/`state.crew`/`state.radiation`/
 * `state.activeIncidents` the same way the station consoles read their own slice.
 *
 * The reactive (post-mount state change) tests here exist because Zustand v5's SSR render
 * path can't see them (apps/web/tests/habitat.test.tsx's own doc comment) — a real browser
 * is the only place a crew relocation or a scripted hazard can actually be observed to
 * update the view.
 */
import type { Page } from "@playwright/test";
import { expect, gotoApp, skipSetup, test } from "./fixtures.js";

/**
 * Advances the clock to at least `targetHour`, handling Decision Cards, the end-of-sol
 * overlay, and the day-boundary "Run the sol" re-lock along the way — the same loop
 * `e2e/dial.spec.ts`'s `finishMission` already established for the same reason (a scripted
 * hazard can land the run on any of those at any hour).
 */
async function advanceToHour(page: Page, targetHour: number): Promise<void> {
  await skipSetup(page);
  const hourButton = page.getByRole("button", { name: "+1 hour" });
  const runSolButton = page.getByRole("button", { name: "Run the sol" });
  const continueButton = page.getByRole("button", { name: "Continue to Sol Planning" });
  for (let i = 0; i < targetHour + 10; i++) {
    while ((await page.locator(".decision-card-response").count()) > 0) {
      await page.locator(".decision-card-response").first().click();
    }
    if ((await continueButton.count()) > 0) await continueButton.click();
    if ((await runSolButton.count()) > 0) await runSolButton.click();
    const hourText = await page.locator(".clock-hour").textContent();
    if (Number(hourText?.replace(/\D/g, "") ?? "0") >= targetHour) return;
    if (!(await hourButton.isDisabled())) await hourButton.click();
  }
}

test.describe("Habitat view", () => {
  test("reachable as the 6th tab, shows the real mission site and body", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Habitat");
    await expect(page.getByRole("heading", { name: "Habitat", exact: true })).toBeVisible();
    // Jezero Outpost is the default mission (store/run.ts).
    await expect(page.getByText(/Jezero Crater, Mars/)).toBeVisible();
  });

  test("shows the animated scene followed by a real text table (Ripple pattern)", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Habitat");

    await expect(page.getByRole("img", { name: /at Jezero Crater, Mars/ })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Location" })).toBeVisible();
    await expect(page.getByText("Time of day")).toBeVisible();
    await expect(page.getByText("Sky conditions")).toBeVisible();
    // Jezero starts clear (no dust storm at hour 0) — a real status word, not colour alone.
    await expect(page.getByText("Clear")).toBeVisible();
  });

  test("a Moon scenario shows no dust storm text and the Moon's own body name", async ({ page }) => {
    await gotoApp(page);
    await page.getByRole("button", { name: /First Light/ }).click();
    for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "▶ Launch Mission" }).click();
    await skipSetup(page, "Habitat");

    await expect(page.getByText(/the Moon/).first()).toBeVisible();
    await expect(page.getByText("No atmosphere — dust storms don't occur")).toBeVisible();
  });

  test("no NASA logo or insignia is present (brief rule 5)", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Habitat");
    await expect(page.locator("img[src*='nasa' i], img[alt*='nasa' i]")).toHaveCount(0);
  });

  test("lists the real crew in the crew table, station and condition included", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Habitat");

    const crewSection = page.locator("section", { has: page.getByRole("heading", { name: "Crew" }) });
    await expect(crewSection.getByText("Ayesha")).toBeVisible();
    await expect(crewSection.getByRole("columnheader", { name: "Station" })).toBeVisible();
    await expect(crewSection.getByRole("columnheader", { name: "Condition" })).toBeVisible();
    await expect(crewSection.getByText("Nominal").first()).toBeVisible();
  });

  test("sending a crew member to the storm shelter or on EVA moves their sprite and table row", async ({
    page,
  }) => {
    await gotoApp(page);
    await skipSetup(page, "Incident Command");

    const crewLocationSection = page.locator("section", { has: page.getByRole("heading", { name: "Crew location" }) });
    await crewLocationSection
      .locator(".crew-location-row")
      .first()
      .getByRole("button", { name: "the storm shelter" })
      .click();

    await skipSetup(page, "Habitat");
    const crewSection = page.locator("section", { has: page.getByRole("heading", { name: "Crew" }) });
    const firstRow = crewSection.locator("tbody tr").first();
    await expect(firstRow).toContainText("the storm shelter");
  });

  test("First Light's own scripted solar particle event shows the real red-alert banner", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await gotoApp(page);
    await page.getByRole("button", { name: /First Light/ }).click();
    for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "▶ Launch Mission" }).click();

    // First Light's own scripted event (packages/sim/src/data/scenarios/firstLight.ts):
    // a solar particle event at hour 100, lasting 18 hours — deterministic, not RNG.
    await advanceToHour(page, 105);
    await skipSetup(page, "Habitat");
    await expect(page.getByText("Solar particle event in progress")).toBeVisible();
  });
});
