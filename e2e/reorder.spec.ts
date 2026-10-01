/**
 * Drag-to-reorder (components/dashboardReorder.ts), exercised in a real browser: a mouse drag
 * on a panel heading, Alt+arrow keyboard moves, persistence across a reload, and the header's
 * "Reset layout" control.
 */
import { expect, gotoApp, openTab, reloadApp, test } from "./fixtures.js";
import type { Page } from "@playwright/test";

/** The reorderable headings on the current page, in visual (top-to-bottom, left-to-right) order. */
async function headingOrder(page: Page): Promise<string[]> {
  return page.locator(".dashboard-grid").evaluate((grid) =>
    Array.from(grid.children)
      .filter((c): c is HTMLElement => c instanceof HTMLElement && c.querySelector("[data-drag-handle]") !== null)
      .sort((a, b) => Number.parseInt(a.style.order || "0", 10) - Number.parseInt(b.style.order || "0", 10))
      .map((c) => c.querySelector("[data-drag-handle]")?.textContent?.trim() ?? ""),
  );
}

async function centre(page: Page, heading: string) {
  const box = await page.locator("[data-drag-handle]", { hasText: heading }).first().boundingBox();
  if (box === null) throw new Error(`no heading "${heading}"`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

test.describe("Dashboard drag-to-reorder", () => {
  test("headings are reorderable handles, with the page header and hidden-heading panels left pinned", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Habitat");
    const handles = await headingOrder(page);
    expect(handles.length).toBeGreaterThanOrEqual(3);
    // The scene panel's heading is visually hidden, so it is not a handle and stays first.
    expect(handles).not.toContain("Habitat scene");
    await expect(page.locator(".view-head [data-drag-handle]")).toHaveCount(0);
  });

  test("dragging a heading onto another panel swaps their places, and the order survives a reload", async ({ page, isMobile }) => {
    test.skip(isMobile, "mouse drag; touch uses a long press, covered by the keyboard test below");
    // Tall enough that every panel is on screen at once — a mouse drag can't reach below the fold.
    await page.setViewportSize({ width: 1280, height: 2600 });
    await gotoApp(page);
    await openTab(page, "Habitat");

    const before = await headingOrder(page);
    const moving = before[before.length - 1] as string;
    const target = before[0] as string;
    expect(moving).not.toBe(target);

    const from = await centre(page, moving);
    const to = await centre(page, target);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y - 8, { steps: 3 });
    await page.mouse.move(to.x, to.y + 20, { steps: 12 });
    await page.waitForTimeout(400);
    await page.mouse.up();
    await page.waitForTimeout(400);

    const after = await headingOrder(page);
    expect(after).not.toEqual(before);
    expect(after.indexOf(moving)).toBeLessThan(before.indexOf(moving));
    expect(await page.evaluate(() => window.localStorage.getItem("sol-keeper.layout.habitat"))).not.toBeNull();

    await reloadApp(page);
    await openTab(page, "Habitat");
    expect(await headingOrder(page)).toEqual(after);
  });

  test("a plain click on a heading does not start a drag or change the order", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Habitat");
    const before = await headingOrder(page);
    const at = await centre(page, before[0] as string);
    await page.mouse.click(at.x, at.y);
    expect(await headingOrder(page)).toEqual(before);
    expect(await page.evaluate(() => window.localStorage.getItem("sol-keeper.layout.habitat"))).toBeNull();
  });

  test("Alt+arrow on a focused heading moves the panel, and Reset layout restores the default", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Habitat");
    const before = await headingOrder(page);
    const first = before[0] as string;

    await page.locator("[data-drag-handle]", { hasText: first }).first().focus();
    await page.keyboard.press("Alt+ArrowDown");
    const moved = await headingOrder(page);
    expect(moved[1]).toBe(first);
    expect(moved[0]).toBe(before[1]);

    await page.getByRole("button", { name: "Reset layout" }).click();
    expect(await headingOrder(page)).toEqual(before);
    expect(await page.evaluate(() => window.localStorage.getItem("sol-keeper.layout.habitat"))).toBeNull();
  });

  test("Alt+arrow at the edge of the sequence is a no-op, not a wrap-around", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Habitat");
    const before = await headingOrder(page);
    await page.locator("[data-drag-handle]", { hasText: before[0] as string }).first().focus();
    await page.keyboard.press("Alt+ArrowUp");
    expect(await headingOrder(page)).toEqual(before);
  });

  /** Touch on the first and third panel headings, via Chrome's own touch events (emulated touch). */
  async function touchSetup(page: Page) {
    await gotoApp(page);
    await openTab(page, "Habitat");
    // On a phone the panels stack in one column; make the page tall enough to see both ends.
    await page.setViewportSize({ width: 390, height: 2600 });
    await page.waitForTimeout(300);
    const before = await headingOrder(page);
    const from = await centre(page, before[0] as string);
    const to = await centre(page, before[2] as string);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    return { before, from, to, touch };
  }

  test("on touch, a long press lifts a heading and dragging it swaps panels", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch emulation is only enabled in the mobile project");
    const { before, from, to, touch } = await touchSetup(page);

    await touch("touchStart", from.x, from.y);
    await page.waitForTimeout(500);
    await expect(page.locator(".dashboard-item-lifted")).toHaveCount(1);
    for (let i = 1; i <= 12; i++) {
      await touch("touchMove", from.x, from.y + ((to.y - from.y) * i) / 12 + 20);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(400);
    await touch("touchEnd", to.x, to.y + 20);
    await page.waitForTimeout(400);

    const after = await headingOrder(page);
    expect(after).not.toEqual(before);
    expect(after.indexOf(before[0] as string)).toBeGreaterThan(0);
  });

  test("on touch, a quick swipe over a heading does not pick the panel up", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch emulation is only enabled in the mobile project");
    const { before, from, touch } = await touchSetup(page);

    await touch("touchStart", from.x, from.y);
    await touch("touchMove", from.x, from.y + 40);
    await touch("touchEnd", from.x, from.y + 40);
    await page.waitForTimeout(300);

    await expect(page.locator(".dashboard-item-lifted")).toHaveCount(0);
    expect(await headingOrder(page)).toEqual(before);
  });
});
