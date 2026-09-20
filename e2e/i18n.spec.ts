/**
 * Proves the en/bn switch actually re-renders real text, not just that i18next is wired
 * up. The scope is deliberately narrow to match what's actually translated at M5 (the app
 * shell and Live Sky) — see i18n/config.ts for what is and isn't covered yet.
 */
import { expect, test } from "@playwright/test";

test.describe("Language switch", () => {
  test("switching to বাংলা changes the tab labels and Live Sky text, and persists across a reload", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Ripple Web" })).toBeVisible();

    await page.getByRole("button", { name: "বাংলা" }).click();
    await expect(page.getByRole("button", { name: "রিপল ওয়েব" })).toBeVisible();
    await expect(page.getByRole("button", { name: "লাইভ স্কাই" })).toBeVisible();

    await page.getByRole("button", { name: "লাইভ স্কাই" }).click();
    await expect(page.locator("h1")).toHaveText("লাইভ স্কাই");
    await expect(page.getByText("পৃথিবী থেকে দূরত্ব")).toBeVisible();

    // The tab shown is plain useState, not persisted (a fresh load always opens on
    // Operate); the language choice itself is what's expected to survive a reload.
    await page.reload();
    await expect(page.getByRole("button", { name: "বাংলা" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "রিপল ওয়েব" })).toBeVisible();
  });
});

test.describe("Language switch screenshot", () => {
  test("full-page screenshot of the Bangla Live Sky view, for a human to check the script renders", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "বাংলা" }).click();
    await page.getByRole("button", { name: "লাইভ স্কাই" }).click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: testInfo.outputPath("live-sky-bn.png"), fullPage: true });
  });
});
