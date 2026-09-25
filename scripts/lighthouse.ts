/**
 * Formalizes the brief's own M9 done-when bar ("30+ FPS in the Lighthouse mobile profile") as
 * a repeatable, one-command check, replacing the ad hoc manual Lighthouse pass M6 did once by
 * hand. Builds apps/web, serves the real production bundle, and runs Lighthouse's CLI against
 * it in its default mobile profile (a Moto G4-class CPU/network throttle — the closest stand-in
 * Lighthouse ships for "a low-end Android phone", CLAUDE.md rule 6).
 *
 * Lighthouse has no literal "FPS" metric — nothing in its report is labelled that. Total
 * Blocking Time is the metric it actually ships that measures the same thing the brief cares
 * about (main-thread jank long enough that input, and by extension scroll/animation smoothness,
 * would stutter), so this checks Performance score and TBT together rather than inventing a
 * number Lighthouse doesn't report. A true rendered-frames-per-second measurement, for the
 * Habitat view's own animated states specifically, is e2e/fps.spec.ts's job (M9.7) — this
 * script is the "Lighthouse mobile profile" half of the done-when bar, not the whole of it.
 *
 * Usage:
 *   pnpm lighthouse
 *
 * Writes lighthouse-report/report.report.html (open it directly — Lighthouse's own naming,
 * not chosen here) and lighthouse-report/report.report.json (machine-readable); both
 * gitignored — a snapshot for one local run, not a tracked artifact.
 */
import { spawn, execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const PREVIEW_PORT = 4321; // distinct from the 4173 dev-preview port, so this can run alongside a manual `pnpm preview`.
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}/`;
// `.pathname` alone percent-encodes spaces (this repo's own directory name has one) into a
// path that no longer exists on disk — `fileURLToPath` is the real filesystem path.
const OUT_DIR = fileURLToPath(new URL("../lighthouse-report/", import.meta.url));

// A judgment call, not a NASA-sourced figure (this is a dev tool, not a `constants.ts`
// value): Lighthouse's own colour bands put "needs improvement" at 0.5 and "good" at 0.9;
// 0.7 sits between them, chosen because this app is a client-heavy SPA (Leaflet, d3-force,
// react-i18next) that will never post a Lighthouse-favourite static-site score, but should
// still comfortably clear "needs improvement".
const MIN_PERFORMANCE_SCORE = 0.7;
// Chrome's own Lighthouse UI colours TBT green under 200ms — the same bar here.
const MAX_TOTAL_BLOCKING_TIME_MS = 200;

interface LighthouseAudit {
  readonly numericValue?: number;
  readonly displayValue?: string;
}

interface LighthouseReport {
  readonly categories: { readonly performance: { readonly score: number } };
  readonly audits: Record<string, LighthouseAudit>;
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(300);
  }
  throw new Error(`${url} never became reachable within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("Building apps/web...");
  await new Promise<void>((resolve, reject) => {
    const build = spawn("pnpm", ["--filter", "@sol-keeper/web", "run", "build"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
  });

  console.log(`Starting preview server on port ${PREVIEW_PORT}...`);
  const preview = spawn(
    "pnpm",
    ["--filter", "@sol-keeper/web", "exec", "vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort"],
    { stdio: "ignore", shell: process.platform === "win32" },
  );

  try {
    await waitForServer(PREVIEW_URL, 15_000);

    // Lighthouse's own multi-output naming: given `--output-path=.../report` with both
    // json and html requested, it writes `report.report.json`/`report.report.html`, not
    // `report.json`/`report.html` — confirmed by an actual run, not assumed.
    const outputPathPrefix = join(OUT_DIR, "report");
    const jsonPath = `${outputPathPrefix}.report.json`;
    const htmlPath = `${outputPathPrefix}.report.html`;

    console.log("Running Lighthouse (mobile profile)...");
    await new Promise<void>((resolve) => {
      execFile(
        "npx",
        [
          "lighthouse",
          PREVIEW_URL,
          "--output=json",
          "--output=html",
          `--output-path=${outputPathPrefix}`,
          "--chrome-flags=--headless=new --no-sandbox",
          "--only-categories=performance",
          "--form-factor=mobile",
          "--quiet",
        ],
        { shell: process.platform === "win32", maxBuffer: 10 * 1024 * 1024 },
        (error) => {
          // Lighthouse's CLI exits non-zero on a low score under some flag combinations even
          // when the run itself succeeded and wrote a report — check the report file exists
          // rather than trusting the exit code alone.
          if (error && !error.message.includes("ENOENT")) console.warn(error.message);
          resolve();
        },
      );
    });

    const raw = await readFile(jsonPath, "utf-8");
    const report = JSON.parse(raw) as LighthouseReport;
    const score = report.categories.performance.score;
    const tbt = report.audits["total-blocking-time"]?.numericValue ?? Number.NaN;
    const lcp = report.audits["largest-contentful-paint"]?.displayValue ?? "?";
    const cls = report.audits["cumulative-layout-shift"]?.displayValue ?? "?";

    console.log("\nLighthouse mobile profile — Setup screen (the app's real first load)");
    console.log(`  Performance score : ${Math.round(score * 100)}/100 (bar: ${Math.round(MIN_PERFORMANCE_SCORE * 100)}+)`);
    console.log(`  Total Blocking Time: ${Math.round(tbt)} ms (bar: <${MAX_TOTAL_BLOCKING_TIME_MS} ms)`);
    console.log(`  Largest Contentful Paint: ${lcp}`);
    console.log(`  Cumulative Layout Shift: ${cls}`);
    console.log(`\nFull report: ${htmlPath}\n`);

    const pass = score >= MIN_PERFORMANCE_SCORE && tbt < MAX_TOTAL_BLOCKING_TIME_MS;
    if (!pass) {
      console.error("FAIL — below the M9 done-when bar. See the report above for what to fix.");
      process.exitCode = 1;
    } else {
      console.log("PASS");
    }
  } finally {
    preview.kill();
  }
}

await main();
