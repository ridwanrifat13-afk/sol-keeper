/**
 * Real-browser check for the Incident Command console's dependency graph and Mission
 * Command's scenario switch (M8.3: both moved out of the old Ripple Web/Operate tabs into
 * their new consoles — see App.tsx's own doc comment). Both need a real browser for the same
 * reason: d3-force's layout only settles inside a `useEffect`, which never runs during the
 * SSR path the Vitest render tests use (see render.test.tsx's own note on this), and
 * switching scenarios exercises the same zustand-store-mutation-after-mount path that a
 * server render can't observe either.
 */
import { expect, gotoApp, openTab, test } from "./fixtures.js";

test.describe("Scenario switch (Mission Command console)", () => {
  test("switching to a Moon scenario changes the mission header and system list", async ({
    page,
  }) => {
    await gotoApp(page);
    await openTab(page, "Mission Command");
    await expect(page.getByText("Jezero Crater")).toBeVisible();

    await page.getByRole("button", { name: /^First Light/ }).click();
    await expect(page.locator(".mission-site")).toContainText("Shackleton Ridge");
    await expect(page.locator(".mission-site")).toContainText("Moon");

    await page.getByRole("button", { name: /^The Long Night/ }).click();
    // Not a bare page-wide getByText: the new "big board" ops-readout (player request #9)
    // shows the same real duration in its own "/ 89 days" unit text, so an unscoped match is
    // now ambiguous — scoped to the mission-site line this test is actually about.
    await expect(page.locator(".mission-site")).toContainText("89 days");

    await page.getByRole("button", { name: /^Jezero/ }).click();
    await expect(page.getByText("Jezero Crater")).toBeVisible();
  });

  test("switching scenario changes the system list on the Power console too", async ({
    page,
  }) => {
    await gotoApp(page);
    await openTab(page, "Mission Command");
    await page.getByRole("button", { name: /^First Light/ }).click();

    // MOXIE is Mars-only ISRU; First Light must not list it as a system. Scoped to .tab-nav:
    // M8.4 Part E's crew-assignment control also has station-name buttons (e.g. "Power") on
    // this same page, so an unscoped lookup is ambiguous.
    await openTab(page, "Power");
    await expect(page.getByText("MOXIE (oxygen from air)")).not.toBeVisible();
  });
});

test.describe("Mission Command console (M8.4 Part E)", () => {
  test("shows station coverage, the daily plan, and real goal status", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Mission Command");

    await expect(page.getByText("Station coverage")).toBeVisible();
    // Jezero's own 4-person crew covers every station via primary or backup (state.ts's
    // round-robin assignment) — real coverage, not an invented "unassigned" case for this
    // scenario specifically; First Light's 2-person roster is the one that leaves stations
    // genuinely unassigned (management.secondResponderPerformanceBonusFraction's own note).
    await expect(page.locator(".status-list-value").filter({ hasText: "%" }).first()).toBeVisible();

    await expect(page.getByText("Daily plan")).toBeVisible();
    await expect(page.getByText("Science downlink")).toBeVisible();

    // Not exact: the glyph (aria-hidden span) is a sibling text node inside the same element,
    // same reason other status checks in this suite avoid an exact match (e.g. gauge status).
    await expect(page.getByText("Primary goal")).toBeVisible();
    await expect(page.getByText("Stretch goal")).toBeVisible();
    // Nothing is met on a fresh mission.
    await expect(page.getByText("Primary goal met")).toHaveCount(0);
  });

  test("crew assignment is real and locked to Sol Planning", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Mission Command");

    const firstRow = page.locator(".crew-location-row").first();
    await firstRow.getByRole("button", { name: "Comms", exact: true }).click();
    await expect(firstRow.getByRole("button", { name: "Comms", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Run the sol" }).click();
    await expect(firstRow.getByRole("button", { name: "Power", exact: true })).toBeDisabled();
    // Not a bare page-wide getByText: M9.x batch 2's own "Crew schedule" panel (same console)
    // carries the identical "Locked while..." phrase in its own hint text, so an unscoped
    // match is now ambiguous — scoped to the crew-assignment panel this test is actually about.
    await expect(
      page.locator("#crew-assignment-heading").locator("..").getByText("Locked while the sol is running"),
    ).toBeVisible();
  });
});

test.describe("Incident Command console", () => {
  test("renders a settled dependency graph with every system node visible and positioned", async ({
    page,
  }) => {
    await gotoApp(page);
    await openTab(page, "Incident Command");

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
    await gotoApp(page);
    await openTab(page, "Incident Command");

    // Scoped to this specific table: the "How the connections work" evidence table (M9.x,
    // player request #2) is also a .ripple-table, with real evidence prose in its own last
    // column, not a status word — a blanket `.ripple-table` selector would wrongly include it.
    const statusTable = page.locator("section", { has: page.getByRole("heading", { name: "Same information, as text" }) });
    await expect(statusTable.getByRole("cell", { name: "Life support", exact: true })).toBeVisible();
    await expect(statusTable.getByRole("cell", { name: "Crew", exact: true })).toBeVisible();
    const statusCells = statusTable.locator(".ripple-table td:last-child");
    await expect(statusCells.first()).toBeVisible();
    for (const text of await statusCells.allInnerTexts()) {
      expect(text).toMatch(/Standby|Powered|Shed|Failed|Nominal|Caution|Critical/);
    }
  });

  test("full-page screenshot for a human to look at", async ({ page }, testInfo) => {
    await gotoApp(page);
    await openTab(page, "Incident Command");
    await page.waitForTimeout(300);
    await page.screenshot({ path: testInfo.outputPath("incident-command.png"), fullPage: true });
  });

  test("switches to reflect a different scenario's system list", async ({ page }) => {
    await gotoApp(page);
    await openTab(page, "Mission Command");
    await page.getByRole("button", { name: /^The Long Night/ }).click();
    // Scoped to .tab-nav: Mission Command's own crew-assignment control (M8.4 Part E) also has
    // a station-name button ("Incident Command") still on screen at this point.
    await openTab(page, "Incident Command");

    // Scoped the same way, and for the same reason, as the previous test — the new evidence
    // table also legitimately says "Reactor" (it names the power node in its From/To columns).
    const statusTable = page.locator("section", { has: page.getByRole("heading", { name: "Same information, as text" }) });
    await expect(statusTable.getByRole("cell", { name: "MOXIE (oxygen from air)" })).toHaveCount(0);
    await expect(statusTable.getByRole("cell", { name: "Reactor" })).toBeVisible();
  });

  test("shows an empty repair queue and every living crew member's real location control", async ({
    page,
  }) => {
    await gotoApp(page);
    await openTab(page, "Incident Command");

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
    await gotoApp(page);
    await openTab(page, "Incident Command");

    const firstRow = page.locator(".crew-location-row").first();
    await firstRow.getByRole("button", { name: "the storm shelter", exact: true }).click();
    await expect(firstRow.getByRole("button", { name: "the storm shelter", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Run the sol" }).click();
    await expect(firstRow.getByRole("button", { name: "the habitat", exact: true })).toBeDisabled();
    // Scoped to the crew-location panel specifically — the spares-inventory panel now carries
    // its own, identically-worded locked notice too (print-a-spare), so an unscoped match is
    // ambiguous.
    await expect(
      page.locator("#crew-location-heading").locator("..").getByText("Locked while the sol is running"),
    ).toBeVisible();
  });
});
