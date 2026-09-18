/**
 * Belt and braces for brief rule 2.
 *
 * ESLint already forbids the non-deterministic APIs inside packages/sim, but lint can be
 * skipped, scoped wrongly, or disabled inline. This test reads the source files and fails
 * on the same set, so a rule-2 violation cannot reach main through a green test run.
 *
 * cli.ts is exempt by design: it is the one file allowed to read argv and write stdout, and
 * it contains no simulation logic.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

const EXEMPT = new Set(["cli.ts"]);

const FORBIDDEN: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /Math\s*\.\s*random/, why: "use the seeded RNG in engine/rng.ts" },
  { pattern: /Date\s*\.\s*now/, why: "the sim has no wall clock; use state.hour" },
  { pattern: /new\s+Date\b/, why: "the sim has no wall clock; use state.hour" },
  { pattern: /\bfetch\s*\(/, why: "the sim performs no I/O" },
  { pattern: /\bdocument\s*\./, why: "the sim must not touch the DOM" },
  { pattern: /\bwindow\s*\./, why: "the sim must not touch the DOM" },
  { pattern: /\bprocess\s*\./, why: "the sim must not read the environment" },
  { pattern: /from\s+["']node:/, why: "the sim must stay platform-free" },
  { pattern: /from\s+["']react/, why: "the sim must stay UI-free" },
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Strips line and block comments so prose about `Math.random` does not trip the scan. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("packages/sim purity (brief rule 2)", () => {
  const files = sourceFiles(SRC_DIR);

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const name = file.slice(SRC_DIR.length);
    const base = name.split("/").pop() ?? name;
    if (EXEMPT.has(base)) continue;

    it(`${name} is pure`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const { pattern, why } of FORBIDDEN) {
        const match = pattern.exec(code);
        expect(match, `${name} contains ${pattern} — ${why}`).toBeNull();
      }
    });
  }

  it("the exemption list stays small and deliberate", () => {
    expect([...EXEMPT]).toEqual(["cli.ts"]);
  });
});
