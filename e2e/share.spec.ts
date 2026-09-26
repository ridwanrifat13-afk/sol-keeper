/**
 * M10.9's e2e half of the brief's own done-when bar: "two browsers opening the same link
 * produce byte-identical final states." `apps/web/tests/doneWhen.test.ts` proves this at the
 * pure decode-and-replay level (no browser involved at all); this spec proves it the other
 * way — two real, separate Chromium contexts (Playwright's own stand-in for "two browsers"),
 * each opening the identical URL, each running M10.9's real replay-at-speed driver
 * (`store/replay.ts`) rather than any test-only shortcut, both ending on the same run
 * signature `MissionReportView` already prints for exactly this purpose (D2's own reason for
 * existing: "gives the done-when e2e test something to assert without a debug-only `window`
 * hook").
 */
import { encodeRunLinkFragment, encodeRunLinkQuery, type RunLinkConfig } from "../apps/web/src/share/runLink.js";
import { expect, test } from "./fixtures.js";

const CONFIG: RunLinkConfig = {
  scenarioId: "jezero-outpost",
  difficulty: "nominal",
  crewSize: 4,
  landingSiteId: "MARS-JEZERO",
  powerArchitecture: "solarBattery",
  shieldingApproach: "hullOnly",
  seed: 5,
};

test.describe("M10.9 done-when: two browsers, one link", () => {
  test("opening the same report link in two separate browser contexts replays to the same final run signature", async ({
    browser,
  }) => {
    // A modest throughHour (not the full ~740-hour mission) — this only needs to prove two
    // independent replays agree, not how long a full mission takes to watch play out.
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment([], 60);
    const url = `/?${query}#i=${fragment}`;

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto(url);
      await pageB.goto(url);

      await expect(pageA.locator(".replay-controls")).toBeVisible();
      await expect(pageB.locator(".replay-controls")).toBeVisible();

      // Fast-forward both — watching at 1× in a CI run would work just as correctly, only
      // slower; this only speeds up the test, it never changes what either replay computes.
      await pageA.getByRole("button", { name: "16×" }).click();
      await pageB.getByRole("button", { name: "16×" }).click();

      await expect(pageA.locator(".replay-controls")).toBeHidden({ timeout: 30000 });
      await expect(pageB.locator(".replay-controls")).toBeHidden({ timeout: 30000 });

      const signatureA = await pageA.locator(".report-run-signature code").textContent();
      const signatureB = await pageB.locator(".report-run-signature code").textContent();

      expect(signatureA).not.toBeNull();
      expect(signatureA).not.toBe("");
      expect(signatureA).toBe(signatureB);

      // Not a trivial pass on two blank pages: the same real outcome/hour appear on both.
      const outcomeA = await pageA.locator(".report-head").textContent();
      const outcomeB = await pageB.locator(".report-head").textContent();
      expect(outcomeA).toBe(outcomeB);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
