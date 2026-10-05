/**
 * M9.1's own "Assets" section: AVIF + WebP + JPEG at 1920w/1280w/960w, served via
 * `<picture>`/`srcset`. scripts/generate-station-images.ts is the build step that produces
 * the `<base>-<width>w.<format>` files this module points at — re-run by hand whenever a
 * station photo changes (CLAUDE.md's `scripts/` convention: local-only, lead-developer-run,
 * not wired into Vercel's own build). Kept as its own module, rather than inlined in
 * StationCockpit.tsx, so a future change to width/format choices touches one file.
 */
const WIDTHS = [1920, 1280, 960] as const;

function srcSet(imageBase: string, format: "avif" | "webp" | "jpg"): string {
  return WIDTHS.map((w) => `/stations/${imageBase}-${w}w.${format} ${w}w`).join(", ");
}

export interface StationImageSources {
  readonly avifSrcSet: string;
  readonly webpSrcSet: string;
  /** The plain `<img>` fallback's own `srcSet` — real browsers that support neither AVIF nor
   *  WebP (or either `<source>` failing to load) still get width negotiation, not one fixed
   *  size. */
  readonly jpegSrcSet: string;
  /** `<img src>` itself — the smallest generated width, a safe single-file fallback for a
   *  browser that ignores `srcSet` entirely. */
  readonly fallbackSrc: string;
}

export function stationImageSources(imageBase: string): StationImageSources {
  return {
    avifSrcSet: srcSet(imageBase, "avif"),
    webpSrcSet: srcSet(imageBase, "webp"),
    jpegSrcSet: srcSet(imageBase, "jpg"),
    fallbackSrc: `/stations/${imageBase}-960w.jpg`,
  };
}
