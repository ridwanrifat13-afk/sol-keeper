import { defineConfig } from "vitest/config";

export default defineConfig({
  // The web tests render React components, so JSX must be transformed. `automatic` matches
  // the app's own `jsx: "react-jsx"` setting, so no React import is needed in test files.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
  },
});
