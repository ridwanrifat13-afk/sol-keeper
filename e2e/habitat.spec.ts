/**
 * Real-browser check for the Habitat view (M9.4a) — the app's 6th tab, a visualization with
 * no levers of its own, reading `state.environment` the same way the station consoles read
 * their own slice.
 */
import { expect, skipSetup, test } from "./fixtures.js";

test.describe("Habitat view", () => {
  test("reachable as the 6th tab, shows the real mission site and body", async ({ page }) => {
    await page.goto("/");
    await skipSetup(page, "Habitat");
    await expect(page.getByRole("heading", { name: "Habitat", exact: true })).toBeVisible();
    // Jezero Outpost is the default mission (store/run.ts).
    await expect(page.getByText(/Jezero Crater, Mars/)).toBeVisible();
  });

  test("shows the animated scene followed by a real text table (Ripple pattern)", async ({ page }) => {
    await page.goto("/");
    await skipSetup(page, "Habitat");

    await expect(page.getByRole("img", { name: /at Jezero Crater, Mars/ })).toBeVisible();
    await expect(page.getByText("Location")).toBeVisible();
    await expect(page.getByText("Time of day")).toBeVisible();
    await expect(page.getByText("Sky conditions")).toBeVisible();
    // Jezero starts clear (no dust storm at hour 0) — a real status word, not colour alone.
    await expect(page.getByText("Clear")).toBeVisible();
  });

  test("a Moon scenario shows no dust storm text and the Moon's own body name", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /First Light/ }).click();
    for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "▶ Launch Mission" }).click();
    await skipSetup(page, "Habitat");

    await expect(page.getByText(/the Moon/).first()).toBeVisible();
    await expect(page.getByText("No atmosphere — dust storms don't occur")).toBeVisible();
  });

  test("no NASA logo or insignia is present (brief rule 5)", async ({ page }) => {
    await page.goto("/");
    await skipSetup(page, "Habitat");
    await expect(page.locator("img[src*='nasa' i], img[alt*='nasa' i]")).toHaveCount(0);
  });
});
