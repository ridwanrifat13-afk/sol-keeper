/**
 * Proves the en/bn switch actually re-renders real text, not just that i18next is wired
 * up. The scope is deliberately narrow to match what's actually translated at M5 (the app
 * shell and Live Sky, now split across the Power and Comms consoles per M8.3) — see
 * i18n/config.ts for what is and isn't covered yet.
 */
import { expect, gotoApp, reloadApp, test } from "./fixtures.js";

test.describe("Language switch", () => {
  test("switching to বাংলা changes the tab labels and Power console text, and persists across a reload", async ({
    page,
  }) => {
    await gotoApp(page);
    await expect(page.getByRole("button", { name: "Power", exact: true })).toBeVisible();

    // `force: true`: a known category of false-positive pointer-event interception under
    // mobile-chrome's touch-viewport emulation between two small adjacent header buttons
    // (the same class of issue e2e/onboarding.spec.ts's own coach-mark clicks already
    // document) — confirmed not a real layout bug (a screenshot at the point of failure
    // shows both buttons correctly positioned and unobstructed; desktop chromium never hits
    // this; window.scrollX/Y sampled over 30 frames here stays at a stable (0, 0)).
    await page.getByRole("button", { name: "বাংলা" }).click({ force: true });
    await expect(page.getByRole("button", { name: "পাওয়ার", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "কমস" })).toBeVisible();

    await page.getByRole("button", { name: "পাওয়ার", exact: true }).click();
    await expect(page.getByText("পৃথিবী")).not.toBeVisible(); // that text lives on Comms now
    await expect(page.getByText(/সাম্প্রতিক/)).toBeVisible();

    await page.getByRole("button", { name: "কমস" }).click();
    await expect(page.getByText("পৃথিবী থেকে দূরত্ব")).toBeVisible();

    // The tab shown is plain useState, not persisted (a fresh load always opens on
    // Briefing); the language choice itself is what's expected to survive a reload.
    await reloadApp(page);
    await expect(page.getByRole("button", { name: "বাংলা" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "পাওয়ার", exact: true })).toBeVisible();
  });
});

test.describe("Language switch screenshot", () => {
  test("full-page screenshot of the Bangla Comms console, for a human to check the script renders", async ({
    page,
  }, testInfo) => {
    await gotoApp(page);
    // See the other test's own note on `force: true` above.
    await page.getByRole("button", { name: "বাংলা" }).click({ force: true });
    await page.getByRole("button", { name: "কমস" }).click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: testInfo.outputPath("comms-console-bn.png"), fullPage: true });
  });
});
