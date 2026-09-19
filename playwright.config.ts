import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser checks for apps/web.
 *
 * These sit alongside, not instead of, the Vitest suite: the render tests in
 * apps/web/tests/render.test.tsx prove the component tree assembles and the sim wiring
 * works (fast, no browser). This config exists for what that path structurally cannot see —
 * layout, paint, and the Reality-Dial-adjacent question of "does a human actually see this
 * on screen" — and for the M6 Lighthouse pass, which needs a real Chromium.
 *
 * webServer builds and serves the production bundle rather than the dev server, so what
 * gets checked is what would actually ship.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Brief rule 6: has to run on a low-end Android phone. This is the closest Playwright
    // gets to that without a real device.
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: "pnpm --filter @sol-keeper/web build && pnpm --filter @sol-keeper/web preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
