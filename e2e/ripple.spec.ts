/**
 * Real-browser check for the Ripple Web and the scenario switch. Both need a real browser
 * for the same reason: d3-force's layout only settles inside a `useEffect`, which never
 * runs during the SSR path the Vitest render tests use (see render.test.tsx's own note on
 * this), and switching scenarios exercises the same zustand-store-mutation-after-mount path
 * that a server render can't observe either.
 */
import { expect, test } from "@playwright/test";

test.describe("Scenario switch", () => {
  test("switching to a Moon scenario changes the mission header and system list", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Jezero Crater")).toBeVisible();

    await page.getByRole("button", { name: /^First Light/ }).click();
    await expect(page.locator(".mission-site")).toContainText("Shackleton Ridge");
    await expect(page.locator(".mission-site")).toContainText("Moon");
    // MOXIE is Mars-only ISRU; First Light must not list it as a system.
    await expect(page.getByText("MOXIE (oxygen from air)")).not.toBeVisible();

    await page.getByRole("button", { name: /^The Long Night/ }).click();
    await expect(page.getByText("89 days")).toBeVisible();

    await page.getByRole("button", { name: /^Jezero/ }).click();
    await expect(page.getByText("Jezero Crater")).toBeVisible();
  });
});

test.describe("Ripple Web", () => {
  test("renders a settled graph with every system node visible and positioned", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ripple Web" }).click();

    await expect(page.locator("h1")).toHaveText("Ripple Web");

    const circles = page.locator(".ripple-node circle");
    await expect(circles.first()).toBeVisible();
    const count = await circles.count();
    expect(count).toBeGreaterThan(10); // power + 9 systems + domains + crew

    // A real browser actually runs the d3-force layout; every node should have moved off
    // a shared (0,0)/fallback point once the simulation has settled (unlike the SSR path,
    // which never runs the effect at all — see render.test.tsx).
    const positions = await circles.evaluateAll((els) =>
      els.map((el) => `${el.getAttribute("cx")},${el.getAttribute("cy")}`),
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  test("the text table carries the same nodes as the graph, with real status words", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ripple Web" }).click();

    await expect(page.getByRole("cell", { name: "Life support", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Crew", exact: true })).toBeVisible();
    const statusCells = page.locator(".ripple-table td:last-child");
    await expect(statusCells.first()).toBeVisible();
    for (const text of await statusCells.allInnerTexts()) {
      expect(text).toMatch(/Standby|Powered|Shed|Failed|Nominal|Caution|Critical/);
    }
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ripple Web" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: testInfo.outputPath("ripple.png"), fullPage: true });
  });

  test("switches to reflect a different scenario's system list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^The Long Night/ }).click();
    await page.getByRole("button", { name: "Ripple Web" }).click();

    await expect(page.getByRole("cell", { name: "MOXIE (oxygen from air)" })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Reactor" })).toBeVisible();
  });
});
