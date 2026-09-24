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
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem("sol-keeper.onboarding", JSON.stringify({ state: { seen: true, step: 0 }, version: 0 }));
    });
    await use(page);
  },
});

export { expect };
