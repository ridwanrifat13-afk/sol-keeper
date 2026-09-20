import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The brief's manifest name — never a NASA name or the agency's own branding
      // (rule 5) — and no auto-update prompt UI to build for the MVP, so `autoUpdate`
      // just installs the newest service worker on the next load rather than stalling on
      // a stale cached version indefinitely.
      registerType: "autoUpdate",
      manifest: {
        name: "Sol Keeper",
        short_name: "Sol Keeper",
        description: "Run a Mars or Moon outpost on real NASA numbers.",
        theme_color: "#0b1020",
        background_color: "#0b1020",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Everything Vite builds (JS/CSS/fonts) plus the committed snapshots, so the app
        // opens and Live Sky/light-time still show real (if stale) data with no network.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}", "snapshots/*.json"],
        runtimeCaching: [
          {
            // NetworkFirst per the brief: try live data, fall back to whatever was last
            // cached if the network fails — and never treat an /api response as fresh for
            // more than a day, so a long-offline session doesn't show week-old "Live" data.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
