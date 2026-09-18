// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Rule 2 of the project brief — packages/sim is pure TypeScript — is enforced here rather
 * than by discipline. See also packages/sim/src/validation/purity.test.ts, which greps the
 * sources as a second net.
 */
const SIM_PURITY_RULES = {
  "no-restricted-globals": [
    "error",
    { name: "window", message: "packages/sim must not touch the DOM (brief rule 2)." },
    { name: "document", message: "packages/sim must not touch the DOM (brief rule 2)." },
    { name: "fetch", message: "packages/sim must not perform I/O (brief rule 2)." },
    { name: "localStorage", message: "packages/sim must not touch browser storage." },
    { name: "process", message: "packages/sim must not read the environment." },
  ],
  "no-restricted-properties": [
    "error",
    {
      object: "Math",
      property: "random",
      message: "Use the injected seeded RNG (engine/rng.ts) — runs must be reproducible.",
    },
    {
      object: "Date",
      property: "now",
      message: "The sim has no wall clock; use state.hour (brief rule 2).",
    },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: "NewExpression[callee.name='Date']",
      message: "The sim has no wall clock; mission time is state.hour (brief rule 2).",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: ["react", "react-dom", "react/*"], message: "packages/sim must stay UI-free." },
        { group: ["node:*", "fs", "path", "os"], message: "packages/sim must stay platform-free." },
      ],
    },
  ],
};

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.vercel/**", "**/coverage/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        // Root-level tooling files (vitest.config.ts and friends) belong to no package
        // tsconfig, so let the default project pick them up.
        projectService: { allowDefaultProject: ["*.ts", "*.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The simulation core: pure, deterministic, platform-free.
    files: ["packages/sim/src/**/*.ts"],
    ignores: ["packages/sim/src/cli.ts", "packages/sim/src/**/*.test.ts"],
    rules: SIM_PURITY_RULES,
  },
  {
    // The headless CLI is the one place in packages/sim allowed to touch the platform:
    // it reads argv and writes to stdout. It contains no simulation logic.
    files: ["packages/sim/src/cli.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  prettier,
);
