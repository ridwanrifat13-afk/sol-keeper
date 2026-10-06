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
 * Opens the mobile nav drawer if it's present and currently closed — a no-op above the
 * sidebar breakpoint (the "Menu" button doesn't render there at all) and a no-op if it's
 * already open. Exists on its own, not just inside `openTab` below, for specs that need to
 * inspect the open drawer's own contents (a tab's label, its aria-current state, ...) rather
 * than immediately click through it.
 */
export async function openMobileNavIfPresent(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "Menu" });
  if ((await menuButton.isVisible()) && (await menuButton.getAttribute("aria-expanded")) !== "true") {
    await menuButton.click();
  }
}

/**
 * Closes the mobile nav drawer if it's open — needed before clicking anything else in
 * .app-head-actions (the language switch, Home, New Mission, ...) while the drawer is open:
 * its own backdrop sits on top of that row at a real stacking order, not just visually, so a
 * real click (even `force: true`, which still clicks real screen coordinates, not a synthetic
 * dispatch straight to the target) lands on the backdrop and closes the drawer instead of
 * reaching the button underneath it.
 */
export async function closeMobileNavIfPresent(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "Menu" });
  if ((await menuButton.isVisible()) && (await menuButton.getAttribute("aria-expanded")) === "true") {
    await menuButton.click();
  }
}

/**
 * Clicks a real tab-nav destination by its label. Below the sidebar breakpoint the tab-nav is
 * an off-canvas drawer (player request, M9.x) — closed by default, opened by the "Menu"
 * hamburger button in .app-head-actions — so a direct click on a tab button there would hit
 * an off-screen element. Opening the menu first (only when it's actually present — the
 * hamburger button doesn't render at all above the breakpoint) makes this the one call site
 * every spec's tab navigation goes through, real for both viewport sizes rather than assuming
 * desktop's always-visible sidebar.
 */
export async function openTab(page: Page, label: string): Promise<void> {
  await openMobileNavIfPresent(page);
  await page.locator(".tab-nav").getByRole("button", { name: label }).click();
}

/**
 * M9: the app now opens on Setup, not Briefing — every pre-M9 spec that expects to land
 * straight on a running mission (the clock, Decision Card, and mission-head are all hidden
 * while Setup is open) needs to get off it first. Clicking any real tab bypasses Setup
 * entirely, using whatever mission is already loaded in the store — no need to actually
 * complete the wizard for a spec that isn't about Setup itself. Defaults to Briefing, since
 * that's where most pre-M9 specs already assumed they'd land.
 */
export async function skipSetup(page: Page, tab = "Briefing"): Promise<void> {
  await openTab(page, tab);
}

/**
 * The Home launch page (`App.tsx`'s own `initialView = "home"` default) landed ahead of
 * Setup as the real app's first screen, but no spec was updated for it — every existing
 * `page.goto("/")` call still expected to land straight on Setup's own "Choose a mission"
 * step. Rather than editing `App.tsx` to skip Home for tests (which would mean the suite no
 * longer exercises the same first screen a real visitor sees), this drives the real button
 * a real visitor would click. A run-link URL (`e2e/share.spec.ts`) is unaffected — it never
 * calls this, and `App.tsx`'s own boot-time effect already redirects a valid link straight
 * to Briefing/Report before Home would ever be visible for long enough to matter.
 */
export async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "Launch Outpost" }).click();
}

/** The same Home gate reappears after any `page.reload()` — `view` is plain `useState`, so a
 *  reload always re-mounts on Home, same as first load. Every header control a persisted-
 *  choice test needs to re-check (the language switch, the low-power toggle, the Reality
 *  Dial) is itself hidden while `view === "home"`, so a reload-then-assert test needs this,
 *  not just a bare `page.reload()`. */
export async function reloadApp(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole("button", { name: "Launch Outpost" }).click();
}

/**
 * M9.1: every station now has a calibrated screen map (screenMaps.ts), so Cockpit is the
 * default view on a wide viewport — real console photos with their own panel layout, not the
 * plain page these specs were written against. Most specs here predate cockpit view and test
 * console behavior that has nothing to do with it (a specific gauge, a specific button, the
 * page's own heading) — Classic is still the exact same DOM those specs always exercised
 * (CockpitTarget is a pure passthrough with no CockpitContext.Provider above it), so this is
 * the one-line fix that keeps them testing what they always tested, rather than incidentally
 * asserting on cockpit's own panel-to-screen-region assignment (which overflow-tabs panels
 * when a console has more of them than the photo has screens — expected, not a bug, and
 * covered on its own terms by e2e/cockpit.spec.ts). A no-op wherever no screen map exists yet
 * for the current station (the toggle itself doesn't render then).
 */
export async function switchToClassicIfPresent(page: Page): Promise<void> {
  const classicButton = page.getByRole("button", { name: "Classic", exact: true });
  if ((await classicButton.count()) > 0) {
    await classicButton.click();
  }
}
