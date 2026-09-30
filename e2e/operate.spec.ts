/**
 * Real-browser smoke test for the Power and Life Support consoles, against the production
 * build (M8.3: these replace the old single Operate tab — see App.tsx's own doc comment).
 *
 * This is the check the render tests (apps/web/tests/render.test.tsx) cannot do: it proves
 * the page actually paints, the CSS actually applies, and a click actually reaches the
 * store and comes back out as a DOM change — in a real Chromium, at a phone viewport.
 */
import { expect, gotoApp, skipSetup, test } from "./fixtures.js";
import type { Page } from "@playwright/test";

/**
 * Dismisses the end-of-sol summary if it's blocking (M8.5 — it appears the instant `step()`
 * crosses a day boundary, before "Run the sol" reappears for the next sol).
 */
async function dismissSolSummaryIfShown(page: Page): Promise<void> {
  const continueButton = page.getByRole("button", { name: "Continue to Sol Planning" });
  if ((await continueButton.count()) > 0) {
    await continueButton.click();
  }
}

/**
 * Clicks "Run the sol" if Sol Planning currently has the clock locked (M8.4 Part A — the
 * brief's own core loop: the clock does not advance during `phase === "planning"`, which
 * `step()` resets to at every 24-hour day boundary, so this needs checking before every
 * step, not just once).
 */
async function runSolIfLocked(page: Page): Promise<void> {
  await dismissSolSummaryIfShown(page);
  const runSolButton = page.getByRole("button", { name: "Run the sol" });
  if ((await runSolButton.count()) > 0) {
    await runSolButton.click();
  }
}

/**
 * Clicks +1 sol `times` times, answering any Decision Card that blocks the way with its
 * first option first — a real player would too, and M8.2's auto-pause means a rapid
 * multi-sol advance can genuinely land on a detected, unresolved incident. Also dismisses
 * the end-of-sol summary (M8.5), which now blocks at every single day boundary since
 * step() halts there unconditionally.
 */
async function advanceSol(page: Page, times: number): Promise<void> {
  const solButton = page.getByRole("button", { name: "+1 sol" });
  for (let i = 0; i < times; i++) {
    while ((await page.locator(".decision-card-response").count()) > 0) {
      await page.locator(".decision-card-response").first().click();
    }
    await runSolIfLocked(page);
    if (await solButton.isDisabled()) break;
    await solButton.click();
  }
}

test.describe("App shell", () => {
  test("opens on Setup, and Briefing (reachable from it) shows the mission header", async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByText("Mission Setup")).toBeVisible();

    await skipSetup(page);
    await expect(page.locator("h1")).toHaveText("Sol Keeper");
    await expect(page.locator(".mission-site")).toContainText("Jezero Crater");
    await expect(page.getByText("Mission Briefing")).toBeVisible();
  });
});

test.describe("Power console", () => {
  test("shows the battery gauge and the priority list", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Power");

    await expect(page.getByRole("heading", { name: "Battery" })).toBeVisible();
    await expect(page.getByText("Power priority")).toBeVisible();
  });

  test("reactor and array status is explicitly labelled read-only, except the real array-cleaning lever (player request)", async ({
    page,
  }) => {
    await gotoApp(page);
    await skipSetup(page, "Power");

    await expect(page.getByRole("heading", { name: "Reactor & array status" })).toBeVisible();
    await expect(page.getByText("read-only", { exact: false })).toBeVisible();
    const panel = page.locator("section", { has: page.getByRole("heading", { name: "Reactor & array status" }) });
    await expect(panel.getByText("Solar array", { exact: true })).toBeVisible();
    // Jezero is Mars — the one real, live button this panel has, not a dead readout: routine
    // dust accumulates every sol (models/environment.ts) whether or not a storm hits, and this
    // is the only lever that addresses it outside that one scripted incident.
    await expect(panel.getByRole("button", { name: "Clean solar arrays" })).toBeEnabled();
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
    await gotoApp(page);
    await skipSetup(page, "Power");

    // Scoped to .priority-state, not a page-wide text search: "Shed" matches
    // case-insensitively and by substring, and the footer's "publiSHED" is a real false
    // positive a page-wide getByText("Shed") hits before this locator narrows past it.
    const rowStatus = page.locator(".priority-state");
    await expect(rowStatus).toHaveCount(9);
    for (const text of await rowStatus.allInnerTexts()) {
      expect(text).toContain("Standby");
    }

    await runSolIfLocked(page);
    await page.getByRole("button", { name: "+1 sol" }).click();

    for (const text of await rowStatus.allInnerTexts()) {
      expect(text).not.toContain("Standby");
      expect(text).toMatch(/Powered|Shed|Failed/);
    }
  });

  test("Sol Planning locks the clock and the priority list until Run the sol is clicked", async ({
    page,
  }) => {
    await gotoApp(page);
    await skipSetup(page, "Power");

    // A fresh mission opens in Sol Planning (phase "planning", store/run.ts) — the clock
    // controls are disabled and a "Run the sol" button is the one live control.
    await expect(page.getByRole("button", { name: "Run the sol" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1 sol" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "1×" })).toBeDisabled();

    // Reordering priorities is still live during planning — that is the whole point of the
    // phase.
    await expect(page.locator(".priority-row").first().getByRole("button", { name: /down, shed it sooner/ })).toBeEnabled();

    await page.getByRole("button", { name: "Run the sol" }).click();

    await expect(page.getByRole("button", { name: "Run the sol" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "+1 sol" })).toBeEnabled();
    // Once the sol is running, the priority order is locked until the next Sol Planning.
    await expect(page.locator(".priority-row").first().getByRole("button", { name: /down, shed it sooner/ })).toBeDisabled();
    // Scoped to the priority-list panel: the array-cleaning panel above it (player request)
    // carries the exact same "locked" sentence for its own control.
    const priorityPanel = page.locator("section", { has: page.getByRole("heading", { name: "Power priority" }) });
    await expect(priorityPanel.getByText("Locked while the sol is running")).toBeVisible();
  });

  test("reordering a power priority moves it in the visible list", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Power");

    const rows = page.locator(".priority-row");
    const secondRowNameBefore = await rows.nth(1).locator(".priority-name").innerText();

    await rows.nth(1).getByRole("button", { name: /up, keep it powered longer/ }).click();

    const firstRowNameAfter = await rows.nth(0).locator(".priority-name").innerText();
    expect(firstRowNameAfter).toBe(secondRowNameBefore);
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await skipSetup(page, "Power");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: testInfo.outputPath("power-console.png"),
      fullPage: true,
    });
  });
});

test.describe("Life Support console", () => {
  test("shows every resource gauge", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");

    for (const label of ["Oxygen", "Carbon dioxide", "Water", "Food", "Cabin"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("shows read-only ISRU and crop status, no invented controls", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");

    // Player request: crop conditions split out of the old combined "ISRU & crops" panel into
    // its own standalone box — Jezero (Mars) has both panels; a Moon scenario would have only
    // Crop conditions, since MOXIE (state.systems.moxie) never exists there.
    await expect(page.getByRole("heading", { name: "ISRU" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Crop conditions" })).toBeVisible();
    await expect(page.getByText("Status only", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("MOXIE", { exact: true })).toBeVisible();
    // Jezero's own crop trays (dial/labels.ts's cropLabel), each with a real grown/health
    // readout — not a settable priority, per the settled decision.
    await expect(page.getByText(/% grown/).first()).toBeVisible();
    // No button anywhere in either panel — nothing here invites a click that does nothing.
    const isruPanel = page.locator("section", { has: page.getByRole("heading", { name: "ISRU", exact: true }) });
    const cropPanel = page.locator("section", { has: page.getByRole("heading", { name: "Crop conditions" }) });
    await expect(isruPanel.locator("button")).toHaveCount(0);
    await expect(cropPanel.locator("button")).toHaveCount(0);
  });

  test("Sol Planning locks rations until Run the sol is clicked", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");

    await expect(page.getByRole("button", { name: "Survival", exact: false })).toBeEnabled();

    await page.getByRole("button", { name: "Run the sol" }).click();

    await expect(page.getByRole("button", { name: "Survival", exact: false })).toBeDisabled();
    // Scoped to the Rations section specifically: the new CO2 scrubber duty-cycle section
    // (player request) carries the exact same "locked" sentence for its own control.
    const rationsSection = page.locator("section", { has: page.getByRole("heading", { name: "Rations" }) });
    await expect(rationsSection.getByText("Locked while the sol is running")).toBeVisible();
  });

  test("advancing the clock changes the sol counter and fills the log", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page);

    await expect(page.getByText("Nothing has happened yet.")).toBeVisible();

    // +1 sol, several times, so at least one hazard or brownout has a chance to fire. The
    // clock and log are in the persistent header (M8.1/M8.3), visible from any tab.
    await advanceSol(page, 15);

    await expect(page.getByText("Sol 0.00")).not.toBeVisible();
    await expect(page.getByText("Nothing has happened yet.")).not.toBeVisible();
  });

  test("changing survival mode updates the CO2 limit shown on the gauge", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");

    await expect(page.getByText("limit 3 mmHg in Nominal mode")).toBeVisible();

    await page.getByRole("button", { name: "Survival", exact: false }).click();

    await expect(page.getByText(/limit .* mmHg in Survival mode/)).toBeVisible();
  });

  test("status is never carried by colour alone: every gauge has a status word", async ({
    page,
  }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");

    // Each .gauge-status element pairs an aria-hidden glyph with the status word as sibling
    // text in one span, so no element's *whole* text is exactly "Nominal" — an anchored text
    // selector finds nothing. Reading each gauge's status text directly matches how a sighted
    // user actually reads it: glyph and word together.
    const statuses = page.locator(".gauge-status");
    await expect(statuses).toHaveCount(5);
    for (const text of await statuses.allInnerTexts()) {
      expect(text).toMatch(/Nominal|Caution|Critical/);
    }
  });

  test("no NASA logo or insignia is present (brief rule 5)", async ({ page }) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");
    await page.waitForTimeout(500);

    await expect(page.getByText("Not affiliated with or endorsed by NASA")).toBeVisible();
    // Scoped to the Life Support console specifically (this describe block's own subject):
    // real NASA hardware photos (player request #4, FactCardGallery) are real <img> elements
    // now, the same "not imageless forever" reasoning briefing.spec.ts's own equivalent check
    // already documents for the Trek map tiles — checked here the same way: every <img>'s src
    // must be real NASA Image Library asset content, never a logo/insignia graphic.
    // `.app-brand-logo` is excluded: the app shell's own "Sol Keeper" mark (BrandMark.tsx, on
    // every non-Home page now) is this project's own team logo, a real, separate, permitted
    // category — not a rule 5 violation to check for here.
    const srcs = await page
      .locator("img:not(.app-brand-logo)")
      .evaluateAll((els) => els.map((el) => el.getAttribute("src") ?? ""));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src).toMatch(/images-assets\.nasa\.gov/);
    }
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await skipSetup(page, "Life Support");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: testInfo.outputPath("life-support-console.png"),
      fullPage: true,
    });
  });
});
