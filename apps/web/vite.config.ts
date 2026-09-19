import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The MVP has to run on a low-end Android phone (brief rule 6), so keep the target
    // modern enough to avoid heavy transpilation but old enough for a 2020-era browser.
    target: "es2020",
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
