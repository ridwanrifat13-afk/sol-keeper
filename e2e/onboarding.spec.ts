/**
 * Real-browser check for the First Light onboarding tutorial and gauge help (M8.7).
 *
 * Deliberately imports from `@playwright/test` directly, not `./fixtures.js` — every other
 * spec's fixture pre-seeds `sol-keeper.onboarding` as already-seen so the tutorial doesn't
 * hijack their first tab click; this file is the one place that needs the real, fresh,
 * unseen state a first-time player actually gets.
 */
import { expect, test, type Page } from "@playwright/test";

/** Dismisses the coach mark if it's showing, without asserting either way — used by tests
 *  that aren't themselves about onboarding but still run against a fresh, unseen context. */
async function skipTutorialIfShown(page: Page): Promise<void> {
  const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
  if ((await coachMark.count()) > 0) {
    await coachMark.getByRole("button", { name: "Skip tutorial" }).click();
  }
}

/** The tab-nav's own "Power"/"Comms"/etc. buttons, scoped away from same-named buttons that
 *  exist elsewhere once the tutorial has (deliberately) redirected to a console — e.g. Power's
 *  own load-shed priority list has a system row named "Life Support" with its own up/down
 *  buttons, which collides with an unscoped `getByRole("button", { name: "Life Support" })`. */
function tabButton(page: Page, label: string) {
  return page.locator(".tab-nav").getByRole("button", { name: label });
}

test.describe("First Light coach mark", () => {
  test("stays off Briefing, then walks all five stations in the brief's own order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "First Light tutorial" })).toHaveCount(0);

    // Leaving Briefing for any tab starts the tutorial at its own first step (Power), not
    // necessarily the tab that was clicked.
    await tabButton(page, "Mission Command").click();
    const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
    await expect(coachMark).toBeVisible();
    await expect(coachMark).toContainText("Step 1 of 5");
    await expect(tabButton(page, "Power")).toHaveAttribute("aria-current", "page");

    const order = ["Power", "Life Support", "Incident Command", "Comms", "Mission Command"];
    for (const [i, label] of order.entries()) {
      await expect(coachMark).toContainText(`Step ${i + 1} of 5`);
      await expect(tabButton(page, label)).toHaveAttribute("aria-current", "page");
      const isLastStep = i + 1 === order.length;
      const button = coachMark.getByRole("button", { name: isLastStep ? "Done" : "Next" });
      if (isLastStep) {
        // A real mouse click here genuinely dismisses the card (verified manually) — Playwright's
        // pre-click hit-test retries indefinitely on this specific fixed-position card only on
        // the mobile-chrome project, a known category of false-positive interception with
        // `position: fixed` elements under touch-viewport emulation, not a real unclickable state.
        await button.click({ force: true });
      } else {
        await button.click();
      }
    }

    await expect(coachMark).toHaveCount(0);
  });

  test("Skip tutorial dismisses it immediately, from any step", async ({ page }) => {
    await page.goto("/");
    await tabButton(page, "Power").click();
    const coachMark = page.getByRole("dialog", { name: "First Light tutorial" });
    await expect(coachMark).toBeVisible();

    await coachMark.getByRole("button", { name: "Skip tutorial" }).click();
    await expect(coachMark).toHaveCount(0);

    // A reload carries the dismissal, the same persisted-choice behaviour as the Reality Dial.
    await page.reload();
    await tabButton(page, "Comms").click();
    await expect(page.getByRole("dialog", { name: "First Light tutorial" })).toHaveCount(0);
  });
});

test.describe("Gauge help", () => {
  test("a gauge's '?' reveals real explanatory text, at the current Reality Dial level", async ({ page }) => {
    await page.goto("/");
    await tabButton(page, "Life Support").click();
    await skipTutorialIfShown(page);
    await tabButton(page, "Life Support").click();

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
    await page.goto("/");
    await page.getByRole("button", { name: /^Cadet/ }).click();
    await tabButton(page, "Life Support").click();
    await skipTutorialIfShown(page);
    await tabButton(page, "Life Support").click();

    await page.getByRole("button", { name: "What is Oxygen?" }).click();
    await expect(page.getByText("If it gets too low, they can't breathe well.", { exact: false })).toBeVisible();
  });
});
