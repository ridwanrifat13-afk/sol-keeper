/**
 * Every existing e2e spec predates the First Light onboarding tutorial (M8.7), which now
 * runs on a completely fresh browser context — real Playwright runs start with empty
 * localStorage, so without this, the coach mark would hijack the very first tab click in
 * every other spec (it force-navigates to Power once the player leaves Briefing) and break
 * assertions that have nothing to do with onboarding.
 *
 * This re-exports Playwright's own `test`/`expect` with one autouse fixture: seed
 * `sol-keeper.onboarding` as already-seen before the page's own scripts run, using the same
 * wire format zustand's `persist` middleware writes (`{state, version}` — see
 * apps/web/src/store/onboarding.ts). Specs that need the *unseen* tutorial itself
 * (e2e/onboarding.spec.ts) import directly from `@playwright/test` instead, deliberately
 * bypassing this fixture.
 */
import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem("sol-keeper.onboarding", JSON.stringify({ state: { seen: true, step: 0 }, version: 0 }));
    });
    await use(page);
  },
});

export { expect };

/**
 * M9: the app now opens on Setup, not Briefing — every pre-M9 spec that expects to land
 * straight on a running mission (the clock, Decision Card, and mission-head are all hidden
 * while Setup is open) needs to get off it first. Clicking any real tab bypasses Setup
 * entirely, using whatever mission is already loaded in the store — no need to actually
 * complete the wizard for a spec that isn't about Setup itself. Defaults to Briefing, since
 * that's where most pre-M9 specs already assumed they'd land.
 */
export async function skipSetup(page: Page, tab = "Briefing"): Promise<void> {
  await page.locator(".tab-nav").getByRole("button", { name: tab }).click();
}
