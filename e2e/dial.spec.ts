/**
 * Real-browser check for M3: the Reality Dial, the tab shell, and the Black Box debrief.
 *
 * This is exactly the surface the Vitest suite structurally cannot exercise end to end,
 * because zustand's SSR path is frozen to each store's snapshot at module import (see the
 * note in apps/web/tests/render.test.tsx) — a real page load and real clicks don't have that
 * limitation, so switching the dial and finishing a mission can actually be observed here.
 */
import { expect, test, type Page } from "@playwright/test";

test.describe("Reality Dial", () => {
  test("switching level changes gauge text without changing status colour", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("161 mmHg")).toBeVisible();
    const oxygenGaugeBefore = await page.locator(".gauge").first().getAttribute("class");

    await page.getByRole("button", { name: /^Cadet/ }).click();
    await expect(page.getByText("161 mmHg")).not.toBeVisible();
    await expect(page.getByText(/Plenty of air/)).toBeVisible();

    const oxygenGaugeAfter = await page.locator(".gauge").first().getAttribute("class");
    expect(oxygenGaugeAfter).toBe(oxygenGaugeBefore);

    await page.getByRole("button", { name: /^Commander/ }).click();
    await expect(page.getByText(/pO₂ from PV=nRT/)).toBeVisible();
  });

  test("the choice persists across a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Cadet/ }).click();
    await expect(page.getByText(/Plenty of air/)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Plenty of air/)).toBeVisible();
  });

  test("cadet status words differ from Nominal/Caution/Critical, and are still present", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Cadet/ }).click();

    const statuses = page.locator(".gauge-status");
    await expect(statuses).toHaveCount(6);
    for (const text of await statuses.allInnerTexts()) {
      expect(text).toMatch(/Good|Careful|Danger/);
    }
  });
});

test.describe("Tab navigation", () => {
  test("switches between Operate, Debrief and Data Sources", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Sol Keeper");

    await page.getByRole("button", { name: "Data Sources" }).click();
    await expect(page.locator("h1")).toHaveText("Data Sources");
    await expect(page.getByText("Not affiliated with or endorsed by NASA")).toBeVisible();

    await page.getByRole("button", { name: /^Debrief/ }).click();
    await expect(page.getByText("fills in once the mission ends")).toBeVisible();

    await page.getByRole("button", { name: "Operate" }).click();
    await expect(page.locator("h1")).toHaveText("Sol Keeper");
  });

  test("Data Sources lists real sources and discloses open placeholders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Data Sources" }).click();

    await expect(page.getByText("BVAD-2022")).toBeVisible();
    await expect(page.getByText("Still unsourced")).toBeVisible();
    await expect(page.getByText("habitat.targetO2PartialPressureMmHg")).toBeVisible();
  });
});

/**
 * Drives the +1 sol button rather than a real-time speed setting: at 4x speed a real 30-sol
 * mission ticks once every 400ms of wall-clock time, over five minutes to finish. Clicking
 * +1 sol dispatches synchronously, so the same 30 sols complete in a couple of seconds.
 * 32 clicks covers the scenario's ~739.8-hour duration at ~25 h/click with room to spare;
 * a crew loss ending the mission early is an equally valid "ended" state for this test.
 */
async function finishMission(page: Page): Promise<void> {
  const solButton = page.getByRole("button", { name: "+1 sol" });
  for (let i = 0; i < 32; i++) {
    if (await solButton.isDisabled()) break;
    await solButton.click();
  }
  await expect(page.locator(".run-badge")).not.toContainText("Running");
}

test.describe("Black Box debrief", () => {
  test("fills in once a mission actually ends", async ({ page }) => {
    await page.goto("/");
    await finishMission(page);

    await page.getByRole("button", { name: /^Debrief/ }).click();

    await expect(page.getByText("Final numbers")).toBeVisible();
    await expect(page.getByText(/Major incidents \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/Full mission log \(\d+\)/)).toBeVisible();

    // The Debrief tab should now show its ready indicator too.
    await expect(page.getByRole("button", { name: "Debrief", exact: false }).locator(".tab-badge")).toBeVisible();
  });

  test("full-page screenshot of the finished debrief, for a human to look at", async (
    { page },
    testInfo,
  ) => {
    await page.goto("/");
    await finishMission(page);
    await page.getByRole("button", { name: /^Debrief/ }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: testInfo.outputPath("debrief.png"), fullPage: true });
  });
});
