/**
 * Real-browser smoke test for the Operate view, against the production build.
 *
 * This is the check the render tests (apps/web/tests/render.test.tsx) cannot do: it proves
 * the page actually paints, the CSS actually applies, and a click actually reaches the
 * store and comes back out as a DOM change — in a real Chromium, at a phone viewport.
 */
import { expect, test } from "@playwright/test";

test.describe("Operate view", () => {
  test("loads and shows the mission header and every gauge", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toHaveText("Sol Keeper");
    await expect(page.getByText("Jezero Crater")).toBeVisible();

    for (const label of ["Oxygen", "Carbon dioxide", "Water", "Food", "Battery", "Cabin"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("advancing the clock changes the sol counter and fills the log", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Nothing has happened yet.")).toBeVisible();

    // +1 sol, several times, so at least one hazard or brownout has a chance to fire.
    const solButton = page.getByRole("button", { name: "+1 sol" });
    for (let i = 0; i < 15; i++) {
      await solButton.click();
    }

    await expect(page.getByText("Sol 0.00")).not.toBeVisible();
    await expect(page.getByText("Nothing has happened yet.")).not.toBeVisible();
  });

  /**
   * Regression test for a bug the full-page screenshot below caught: on first load, every
   * power priority row read "Shed", claiming nine systems had already lost power on a
   * mission that had not started — inconsistent with the battery gauge, which correctly
   * showed "0.0 of 0.0 kW served". Only a real render exposed it; the pre-tick frame these
   * assertions check is exactly the one a Vitest render test tends to skip past.
   */
  test("the power priority list reads Standby before the clock runs, then resolves", async ({
    page,
  }) => {
    await page.goto("/");

    // Scoped to .priority-state, not a page-wide text search: "Shed" matches
    // case-insensitively and by substring, and the footer's "publiSHED" is a real false
    // positive a page-wide getByText("Shed") hits before this locator narrows past it.
    const rowStatus = page.locator(".priority-state");
    await expect(rowStatus).toHaveCount(9);
    for (const text of await rowStatus.allInnerTexts()) {
      expect(text).toContain("Standby");
    }

    await page.getByRole("button", { name: "+1 sol" }).click();

    for (const text of await rowStatus.allInnerTexts()) {
      expect(text).not.toContain("Standby");
      expect(text).toMatch(/Powered|Shed|Failed/);
    }
  });

  test("changing survival mode updates the CO2 limit shown on the gauge", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("limit 3 mmHg in Nominal mode")).toBeVisible();

    await page.getByRole("button", { name: "Survival", exact: false }).click();

    await expect(page.getByText(/limit .* mmHg in Survival mode/)).toBeVisible();
  });

  test("reordering a power priority moves it in the visible list", async ({ page }) => {
    await page.goto("/");

    const rows = page.locator(".priority-row");
    const secondRowNameBefore = await rows.nth(1).locator(".priority-name").innerText();

    await rows.nth(1).getByRole("button", { name: /up, keep it powered longer/ }).click();

    const firstRowNameAfter = await rows.nth(0).locator(".priority-name").innerText();
    expect(firstRowNameAfter).toBe(secondRowNameBefore);
  });

  test("status is never carried by colour alone: every gauge has a status word", async ({
    page,
  }) => {
    await page.goto("/");

    // Each .gauge-status element pairs an aria-hidden glyph with the status word as sibling
    // text in one span, so no element's *whole* text is exactly "Nominal" — an anchored text
    // selector finds nothing. Reading each gauge's status text directly matches how a sighted
    // user actually reads it: glyph and word together.
    const statuses = page.locator(".gauge-status");
    await expect(statuses).toHaveCount(6);
    for (const text of await statuses.allInnerTexts()) {
      expect(text).toMatch(/Nominal|Caution|Critical/);
    }
  });

  test("no NASA logo or insignia is present (brief rule 5)", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Not affiliated with or endorsed by NASA")).toBeVisible();
    const images = await page.locator("img").count();
    // The MVP ships no images at all yet; this fails loudly the day one is added without
    // review, which is exactly when rule 5 needs re-checking.
    expect(images).toBe(0);
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: testInfo.outputPath("operate-view.png"),
      fullPage: true,
    });
  });
});
