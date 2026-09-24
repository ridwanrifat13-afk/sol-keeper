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
    await page.getByRole("button", { name: "Life Support" }).click();

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
    await page.getByRole("button", { name: "Life Support" }).click();
    await page.getByRole("button", { name: /^Cadet/ }).click();
    await expect(page.getByText(/Plenty of air/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: /^Cadet/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("cadet status words differ from Nominal/Caution/Critical, and are still present", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Life Support" }).click();
    await page.getByRole("button", { name: /^Cadet/ }).click();

    const statuses = page.locator(".gauge-status");
    await expect(statuses).toHaveCount(5);
    for (const text of await statuses.allInnerTexts()) {
      expect(text).toMatch(/Good|Careful|Danger/);
    }
  });
});

test.describe("Tab navigation", () => {
  test("switches between station consoles, Debrief, and Briefing", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Sol Keeper");
    await expect(page.getByText("Mission Briefing")).toBeVisible();

    await page.getByRole("button", { name: /^Debrief/ }).click();
    await expect(page.getByText("fills in once the mission ends")).toBeVisible();

    await page.getByRole("button", { name: "Briefing" }).click();
    await expect(page.getByText("Mission Briefing")).toBeVisible();
  });

  test("Data Sources opens as an overlay from any tab, and closes again", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Power", exact: true }).click();

    await page.getByRole("button", { name: "Data Sources" }).click();
    const overlay = page.getByRole("dialog", { name: "Data Sources" });
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText("Not affiliated with or endorsed by NASA")).toBeVisible();

    await overlay.getByRole("button", { name: /Close/ }).click();
    await expect(overlay).not.toBeVisible();
    // Closing the overlay leaves the underlying tab exactly where it was.
    await expect(page.getByText("Power priority")).toBeVisible();
  });

  test("Data Sources lists real sources and discloses open placeholders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Data Sources" }).click();

    const overlay = page.getByRole("dialog", { name: "Data Sources" });
    await expect(overlay.getByText("BVAD-2022")).toBeVisible();
    await expect(overlay.getByText("Still unsourced (4)")).toBeVisible();
  });
});

/**
 * Drives the +1 sol button rather than a real-time speed setting: at 4x speed a real 30-sol
 * mission ticks once every 400ms of wall-clock time, over five minutes to finish. Clicking
 * +1 sol dispatches synchronously, so the same 30 sols complete in a couple of seconds — a
 * crew loss ending the mission early is an equally valid "ended" state for this test. The
 * button is in the persistent header (M8.1/M8.3), so it does not matter which tab is active.
 *
 * M8.2's auto-pause (store/run.ts) means a "+1 sol" click can land on a newly detected
 * incident or a worsened gauge status well before the full ~24.66 h — the *hour* it happens,
 * not the sol — so a click can net as little as one real hour instead of ~25. That makes a
 * fixed click count unreliable; this loops until the mission genuinely ends (or a generous
 * safety cap), answering any Decision Card that blocks the way with its first option, the
 * same as a real player must.
 *
 * M8.4 Part A: `step()` also resets `phase` to "planning" at every day boundary, which locks
 * "+1 sol" until "Run the sol" is clicked again (components/TimeControls.tsx) — so that has
 * to be checked before every click here too, not just once at the start.
 */
async function finishMission(page: Page): Promise<void> {
  const solButton = page.getByRole("button", { name: "+1 sol" });
  const runSolButton = page.getByRole("button", { name: "Run the sol" });
  for (let i = 0; i < 400; i++) {
    while ((await page.locator(".decision-card-response").count()) > 0) {
      await page.locator(".decision-card-response").first().click();
    }
    if ((await runSolButton.count()) > 0) {
      await runSolButton.click();
    }
    if (await solButton.isDisabled()) break;
    await solButton.click();
  }
  while ((await page.locator(".decision-card-response").count()) > 0) {
    await page.locator(".decision-card-response").first().click();
  }
  await expect(page.locator(".run-badge")).not.toContainText("Running");
}

test.describe("Black Box debrief", () => {
  test("fills in once a mission actually ends", async ({ page }) => {
    test.setTimeout(60000); // auto-pause can make finishMission take more clicks than before
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
    test.setTimeout(60000); // auto-pause can make finishMission take more clicks than before
    await page.goto("/");
    await finishMission(page);
    await page.getByRole("button", { name: /^Debrief/ }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: testInfo.outputPath("debrief.png"), fullPage: true });
  });
});
