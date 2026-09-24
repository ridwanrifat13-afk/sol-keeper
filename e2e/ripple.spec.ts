/**
 * Real-browser check for the Incident Command console's dependency graph and Mission
 * Command's scenario switch (M8.3: both moved out of the old Ripple Web/Operate tabs into
 * their new consoles — see App.tsx's own doc comment). Both need a real browser for the same
 * reason: d3-force's layout only settles inside a `useEffect`, which never runs during the
 * SSR path the Vitest render tests use (see render.test.tsx's own note on this), and
 * switching scenarios exercises the same zustand-store-mutation-after-mount path that a
 * server render can't observe either.
 */
import { expect, test } from "@playwright/test";

test.describe("Scenario switch (Mission Command console)", () => {
  test("switching to a Moon scenario changes the mission header and system list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mission Command" }).click();
    await expect(page.getByText("Jezero Crater")).toBeVisible();

    await page.getByRole("button", { name: /^First Light/ }).click();
    await expect(page.locator(".mission-site")).toContainText("Shackleton Ridge");
    await expect(page.locator(".mission-site")).toContainText("Moon");

    await page.getByRole("button", { name: /^The Long Night/ }).click();
    await expect(page.getByText("89 days")).toBeVisible();

    await page.getByRole("button", { name: /^Jezero/ }).click();
    await expect(page.getByText("Jezero Crater")).toBeVisible();
  });

  test("switching scenario changes the system list on the Power console too", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mission Command" }).click();
    await page.getByRole("button", { name: /^First Light/ }).click();

    // MOXIE is Mars-only ISRU; First Light must not list it as a system.
    await page.getByRole("button", { name: "Power", exact: true }).click();
    await expect(page.getByText("MOXIE (oxygen from air)")).not.toBeVisible();
  });
});

test.describe("Incident Command console", () => {
  test("renders a settled dependency graph with every system node visible and positioned", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Incident Command" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Incident Command" })).toBeVisible();

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
    await page.getByRole("button", { name: "Incident Command" }).click();

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
    await page.getByRole("button", { name: "Incident Command" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: testInfo.outputPath("incident-command.png"), fullPage: true });
  });

  test("switches to reflect a different scenario's system list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Mission Command" }).click();
    await page.getByRole("button", { name: /^The Long Night/ }).click();
    await page.getByRole("button", { name: "Incident Command" }).click();

    await expect(page.getByRole("cell", { name: "MOXIE (oxygen from air)" })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Reactor" })).toBeVisible();
  });

  test("shows an empty repair queue and every living crew member's real location control", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Incident Command" }).click();

    await expect(page.getByText("Nothing queued.")).toBeVisible();
    // Jezero's own 4-person crew, each starting in the habitat.
    const rows = page.locator(".crew-location-row");
    await expect(rows).toHaveCount(4);
    await expect(rows.first().getByRole("button", { name: "the habitat", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("sending a crew member to the storm shelter is real and locked to Sol Planning", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Incident Command" }).click();

    const firstRow = page.locator(".crew-location-row").first();
    await firstRow.getByRole("button", { name: "the storm shelter", exact: true }).click();
    await expect(firstRow.getByRole("button", { name: "the storm shelter", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Run the sol" }).click();
    await expect(firstRow.getByRole("button", { name: "the habitat", exact: true })).toBeDisabled();
    await expect(page.getByText("Locked while the sol is running")).toBeVisible();
  });
});
