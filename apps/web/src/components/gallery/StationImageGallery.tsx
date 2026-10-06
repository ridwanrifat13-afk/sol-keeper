import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { useAccessibility } from "../../store/accessibility.js";
import { InfiniteGallery, type GalleryImage } from "./InfiniteGallery.js";
import type { NasaImagesResponse } from "../../../server-lib/types.js";
import type { ImageQueryKey } from "../../../server-lib/validate.js";

function useTopicImages(topic: ImageQueryKey) {
  return useLiveOrSnapshot<NasaImagesResponse>(`/snapshots/nasa-images-${topic}.json`, `/api/nasa-images?q=${topic}`);
}

/** images-assets.nasa.gov sends no CORS header, so a plain <img> can show it (the station
 *  consoles already do) but WebGL cannot load it as a texture — the browser refuses the
 *  cross-origin fetch. /api/nasa-image-thumb re-serves the same bytes same-origin so the
 *  gallery's three.js textures can actually load; see that endpoint's own doc comment. */
function proxiedThumbUrl(thumbUrl: string): string {
  return `/api/nasa-image-thumb?url=${encodeURIComponent(thumbUrl)}`;
}

/** A single failed/rejected texture load (a flaky network, one bad image) would otherwise
 *  throw past Suspense — Suspense only catches *pending* promises, not rejected ones — and
 *  take the whole decorative gallery down with it. This is purely atmospheric content, so
 *  the right failure mode is "fall back to the static photo," never a crashed page. */
class GalleryErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);
  return reduced;
}

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/**
 * Decorative background for the homepage's Launch Windows section — the exact same live
 * NASA photos the station consoles already pull (same /api/nasa-images + snapshot fallback
 * FactCardGallery.tsx uses), repurposed as a drifting photo backdrop behind the launch-window
 * glass cards instead of a second, separate image fetch.
 *
 * Purely atmospheric: aria-hidden, since these photos carry no information the player needs
 * that isn't already presented — with real credit text, per CLAUDE.md rule 5 — inside the
 * station consoles themselves. That's a deliberate choice, not a gap: the established
 * "Ripple pattern" in this codebase (animated SVG + parallel real text table, see
 * IncidentCommandConsole's dependency graph) is for animated content that *is* the
 * information; a decorative background picture carousel is the other case accessibility
 * guidance treats differently — mark it hidden, don't force screen-reader users through a
 * redundant list of background images.
 *
 * Heavy (WebGL + a three.js scene) for what it's decorating, so every real "should this even
 * run" check lives here, not in InfiniteGallery itself: the player's own low-power-mode
 * toggle (store/accessibility.ts, same switch that turns off the cockpit view and the hero's
 * parallax), the OS prefers-reduced-motion signal, actual WebGL support, and — since Launch
 * Windows sits well below the fold — only ever mounting the Canvas once the section is close
 * to the viewport. Any one of those failing falls back to a single static photo, not a grid:
 * this is a backdrop, not a content list.
 */
export function StationImageGallery({ className }: { readonly className?: string }) {
  // Every topic a station console actually pulls from /api/nasa-images (PowerConsole,
  // HabitatView, CommsConsole, LifeSupportConsole — both bodies, since this gallery runs on
  // the homepage before any scenario/body is chosen). A fixed set of hook calls, not a loop
  // over a topic list — React's rules of hooks.
  const marsHabitat = useTopicImages("mars-habitat-concept");
  const lunarHabitat = useTopicImages("lunar-habitat-concept");
  const deepSpaceNetwork = useTopicImages("deep-space-network");
  const co2Scrubber = useTopicImages("co2-scrubber");
  const veggie = useTopicImages("veggie");
  const moxie = useTopicImages("moxie");
  const lunarSouthPole = useTopicImages("lunar-south-pole");

  const images: GalleryImage[] = [marsHabitat, lunarHabitat, deepSpaceNetwork, co2Scrubber, veggie, moxie, lunarSouthPole]
    .flatMap((result) => result.data?.items ?? [])
    .map((item) => ({ src: proxiedThumbUrl(item.thumbUrl), alt: item.title }));

  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);
  const reducedMotion = usePrefersReducedMotion();
  const [webgl] = useState(hasWebgl);
  const [nearViewport, setNearViewport] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const animated = nearViewport && webgl && !lowPowerMode && !reducedMotion && images.length > 0;
  const firstImage = images[0];
  const staticFallback = firstImage ? (
    <div className="station-image-gallery-static" style={{ backgroundImage: `url(${firstImage.src})` }} />
  ) : null;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {animated ? (
        <GalleryErrorBoundary fallback={staticFallback}>
          <InfiniteGallery images={images} visibleCount={6} />
        </GalleryErrorBoundary>
      ) : (
        staticFallback
      )}
    </div>
  );
}
