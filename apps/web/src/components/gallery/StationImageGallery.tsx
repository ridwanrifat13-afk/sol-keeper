import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useAccessibility } from "../../store/accessibility.js";
import { InfiniteGallery } from "./InfiniteGallery.js";
import { GALLERY_IMAGES } from "./galleryImages.js";

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
 * Decorative background for the homepage's Launch Windows section — a curated, self-hosted
 * subset of the exact same NASA photos the station consoles pull live (galleryImages.ts).
 * Player report: the first version fetched all ~60 live photos through a CORS proxy
 * (images-assets.nasa.gov sends no Access-Control-Allow-Origin header, so WebGL can't load
 * them directly) and `useTexture` suspends until every one of them resolves — on a slow
 * connection that meant the gallery's first real paint took far too long. Self-hosting a
 * fixed set fixes this at the root: same-origin, no round trip to NASA's CDN, PWA-precached
 * for offline use.
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

  const animated = nearViewport && webgl && !lowPowerMode && !reducedMotion;
  const firstImage = GALLERY_IMAGES[0];
  const staticFallback = firstImage ? (
    <div className="station-image-gallery-static" style={{ backgroundImage: `url(${firstImage.src})` }} />
  ) : null;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {animated ? (
        <GalleryErrorBoundary fallback={staticFallback}>
          <InfiniteGallery images={GALLERY_IMAGES} visibleCount={6} />
        </GalleryErrorBoundary>
      ) : (
        staticFallback
      )}
    </div>
  );
}
