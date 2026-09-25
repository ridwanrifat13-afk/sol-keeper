/**
 * Real-browser check for M9.4c's manual low-power-mode toggle — a player choice
 * (store/accessibility.ts's own doc comment explains why it isn't auto-detected), separate
 * from the OS's own `prefers-reduced-motion` media query, that must produce the exact same
 * effect: the establishing shot's transit animation actually stops running, not just a class
 * being present with no real consequence.
 */
import { expect, test } from "./fixtures.js";

test.describe("Low-power mode", () => {
  test("toggling it sets the root class and persists across a reload", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Low-power mode" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).not.toHaveClass(/low-power-mode/);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveClass(/low-power-mode/);

    await page.reload();
    await expect(page.getByRole("button", { name: "Low-power mode" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveClass(/low-power-mode/);
  });

  test("actually stops the establishing shot's transit animation, not just a class with no effect", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Low-power mode" }).click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 5 of 8: Transit")).toBeVisible();

    const craft = page.locator(".establishing-shot-craft");
    const animationName = await craft.evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("none");
  });

  test("off by default, the craft's animation is genuinely running", async ({ page }) => {
    await page.goto("/");
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 5 of 8: Transit")).toBeVisible();

    const craft = page.locator(".establishing-shot-craft");
    const animationName = await craft.evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("establishing-shot-transit");
  });
});
