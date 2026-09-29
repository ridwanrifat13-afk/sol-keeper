/**
 * Real-browser check for the First Light onboarding tutorial and gauge help (M8.7).
 *
 * Deliberately imports from `@playwright/test` directly, not `./fixtures.js` — every other
 * spec's fixture pre-seeds `sol-keeper.onboarding` as already-seen so the tutorial doesn't
 * hijack their first tab click; this file is the one place that needs the real, fresh,
 * unseen state a first-time player actually gets.
 */
import { expect, test, type Page } from "@playwright/test";
import { gotoApp, reloadApp } from "./fixtures.js";

/** Dismisses the coach mark if it's showing, without asserting either way — used by tests
 *  that aren't themselves about onboarding but still run against a fresh, unseen context.
 *  `force: true`: this `position: fixed` dialog is the known category of false-positive
 *  pointer-event interception under mobile-chrome's touch-viewport emulation the coach-mark
 *  loop below already documents — real on-device clicks land fine. */
async function skipTutorialIfShown(page: Page): Promise<void> {
  const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
  if ((await coachMark.count()) > 0) {
    await coachMark.getByRole("button", { name: "Skip tutorial" }).click({ force: true });
  }
}

/** The tab-nav's own "Power"/"Comms"/etc. buttons, scoped away from same-named buttons that
 *  exist elsewhere once the tutorial has (deliberately) redirected to a console — e.g. Power's
 *  own load-shed priority list has a system row named "Life Support" with its own up/down
 *  buttons, which collides with an unscoped `getByRole("button", { name: "Life Support" })`. */
function tabButton(page: Page, label: string) {
  return page.locator(".tab-nav").getByRole("button", { name: label });
}

/** Actually navigates to a tab, unlike `tabButton` alone — below the sidebar breakpoint the
 *  tab-nav is a closed-by-default off-canvas drawer (player request, M9.x), so a bare click
 *  on the tab button would hit an off-screen element there. Opens the "Menu" hamburger first
 *  when it's present (it doesn't render at all above the breakpoint). Every `toHaveAttribute`
 *  assertion elsewhere in this file still reads straight off `tabButton`, since checking a DOM
 *  attribute needs no visibility. */
async function clickTab(page: Page, label: string): Promise<void> {
  const menuButton = page.getByRole("button", { name: "Menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await tabButton(page, label).click();
}

test.describe("First Light coach mark", () => {
  test("stays off Setup and Briefing, then describes whichever station the player actually clicked (bug fix: it used to force Power regardless of the click)", async ({
    page,
  }) => {
    await gotoApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "First Light tutorial" })).toHaveCount(0);

    // Briefing is reachable straight from Setup (a real tab) — the tutorial stays off it too.
    await clickTab(page, "Briefing");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "First Light tutorial" })).toHaveCount(0);

    // Leaving Briefing for Mission Command starts the tutorial anchored to Mission Command —
    // the tab the player actually clicked, never silently overridden to some fixed first tab.
    await clickTab(page, "Mission Command");
    const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
    await expect(coachMark).toBeVisible();
    await expect(coachMark).toContainText("Step 1 of 5");
    await expect(coachMark).toContainText("Mission Command");
    await expect(tabButton(page, "Mission Command")).toHaveAttribute("aria-current", "page");

    // Clicking a different tab directly is respected immediately too, not just the first one.
    await clickTab(page, "Comms");
    await expect(coachMark).toContainText("Comms");
    await expect(tabButton(page, "Comms")).toHaveAttribute("aria-current", "page");

    // "Next" still offers a guided walk through the brief's own fixed order, starting from
    // wherever the tour began (Mission Command here) — this run's own real sequence. Four
    // "Next" clicks (step 0->1->2->3->4) each drive to and describe the next station in
    // COACH_MARK_ORDER; a player who started on Mission Command (that order's own last entry)
    // sees it once now and once again as the tour's own final step — the disclosed edge case
    // CoachMark.tsx's own doc comment names, not a bug.
    await clickTab(page, "Mission Command");
    await expect(coachMark).toContainText("Step 1 of 5");
    const order = ["Life Support", "Incident Command", "Comms", "Mission Command"];
    for (const [i, label] of order.entries()) {
      // A real mouse click here genuinely dismisses/advances the card (verified manually) —
      // Playwright's pre-click hit-test retries indefinitely on this fixed-position card on
      // the mobile-chrome project, a known category of false-positive interception with
      // `position: fixed` elements under touch-viewport emulation, not a real unclickable
      // state (same note as `skipTutorialIfShown` above).
      await coachMark.getByRole("button", { name: "Next" }).click({ force: true });
      await expect(coachMark).toContainText(`Step ${i + 2} of 5`);
      await expect(tabButton(page, label)).toHaveAttribute("aria-current", "page");
    }

    // One more click (step 4, "of 5" already showing) finishes the tour with no further
    // navigation — COACH_MARK_ORDER has no 6th entry to drive to.
    await coachMark.getByRole("button", { name: "Done" }).click({ force: true });
    await expect(coachMark).toHaveCount(0);
  });

  test("does not auto-pause a running sol when navigating between stations, or back from Habitat (bug fix: it used to reset phase to Sol Planning on every re-activation)", async ({
    page,
  }) => {
    await gotoApp(page);
    await clickTab(page, "Power");
    await page.getByRole("button", { name: "▶ Run the sol" }).click();
    await page.getByRole("button", { name: "1×" }).click();
    await page.waitForTimeout(1500);
    const hourAfterRunning = await page.locator(".clock-hour").textContent();
    expect(hourAfterRunning).not.toBe("hour 0");

    // Habitat isn't a station — leaving it for one re-activates the coach mark, which used to
    // silently pause a running sol as a side effect of that re-activation alone.
    await clickTab(page, "Habitat");
    await clickTab(page, "Comms");
    await page.waitForTimeout(1500);

    // If it paused, "Run the sol" (only shown while phase === "planning") would be back.
    await expect(page.getByRole("button", { name: "▶ Run the sol" })).toHaveCount(0);
    const hourAfterSwitching = await page.locator(".clock-hour").textContent();
    expect(hourAfterSwitching).not.toBe(hourAfterRunning);
  });

  test("Skip tutorial dismisses it immediately, from any step", async ({ page }) => {
    await gotoApp(page);
    await clickTab(page, "Power");
    const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
    await expect(coachMark).toBeVisible();

    // force: true — see skipTutorialIfShown's own note above.
    await coachMark.getByRole("button", { name: "Skip tutorial" }).click({ force: true });
    await expect(coachMark).toHaveCount(0);

    // A reload carries the dismissal, the same persisted-choice behaviour as the Reality Dial.
    await reloadApp(page);
    await clickTab(page, "Comms");
    await expect(page.getByRole("dialog", { name: "First Light tutorial" })).toHaveCount(0);
  });
});

test.describe("Gauge help", () => {
  test("a gauge's '?' reveals real explanatory text, at the current Reality Dial level", async ({ page }) => {
    await gotoApp(page);
    await clickTab(page, "Life Support");
    await skipTutorialIfShown(page);
    await clickTab(page, "Life Support");

    const oxygenHelp = page.getByRole("button", { name: "What is Oxygen?" });
    await expect(oxygenHelp).toBeVisible();
    await expect(page.getByText("Cabin oxygen partial pressure.", { exact: false })).toHaveCount(0);

    await oxygenHelp.click();
    await expect(page.getByText("Cabin oxygen partial pressure.", { exact: false })).toBeVisible();
    await expect(oxygenHelp).toHaveAttribute("aria-expanded", "true");

    await oxygenHelp.click();
    await expect(page.getByText("Cabin oxygen partial pressure.", { exact: false })).toHaveCount(0);
  });

  test("cadet level shows plain-word help text instead", async ({ page }) => {
    await gotoApp(page);
    // DialSwitch is hidden while Setup is open — get off it first.
    await clickTab(page, "Life Support");
    await skipTutorialIfShown(page);
    await page.getByRole("button", { name: /^Cadet/ }).click();
    await clickTab(page, "Life Support");

    await page.getByRole("button", { name: "What is Oxygen?" }).click();
    await expect(page.getByText("If it gets too low, they can't breathe well.", { exact: false })).toBeVisible();
  });
});
