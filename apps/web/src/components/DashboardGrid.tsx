import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { attachReorder, type Reorder } from "./dashboardReorder.js";

/** `useLayoutEffect` warns when rendered on the server (this app's render tests use
 *  `renderToString`); there is nothing to measure there anyway, so fall back to `useEffect`. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Gap-free dashboard packing for a page's panels.
 *
 * A plain two-column CSS grid aligns panels into rows, so the shorter panel in each row is
 * stretched to match the taller one — the blank space inside a tab the player reported. This
 * is a masonry layout instead: every panel keeps exactly its own content height, and the
 * next panel drops into whichever column is currently shorter, so a column never ends in a
 * hole beside a taller neighbour.
 *
 * How: once measured, the grid switches (`data-masonry="on"`, styles.css) to 1px implicit
 * rows, and each child gets `grid-row-end: span <its own height + the gap>`. Placement stays
 * CSS auto-placement, so DOM/reading order is untouched and `.panel-span-full` / `.view-head`
 * (`grid-column: 1 / -1`) keep working as full-width rows. A ResizeObserver re-measures a
 * panel whenever its content changes (live gauges, a table gaining a row, a map tile
 * loading), so the packing follows the live simulation rather than a one-off measurement.
 *
 * Before the first measurement (server render, tests) the grid is the ordinary two-column
 * grid, just without row stretching — a graceful fallback, never a collapsed layout.
 *
 * `layoutKey` (optional) makes the panels drag-to-reorderable and remembers the player's order
 * for that page — see components/dashboardReorder.ts for the interaction model. Leave it unset
 * for a page that should stay fixed.
 */
export function DashboardGrid({
  className = "",
  layoutKey,
  children,
}: {
  readonly className?: string;
  readonly layoutKey?: string;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const container = ref.current;
    if (container === null) return;

    const place = (child: HTMLElement): void => {
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
      const height = Math.ceil(child.getBoundingClientRect().height);
      child.style.gridRowEnd = `span ${Math.max(1, height + gap)}`;
    };

    const reorder: Reorder | undefined =
      layoutKey === undefined ? undefined : attachReorder(container, layoutKey);

    const observed = new Set<HTMLElement>();
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          // Container width changed (one-to-two-column breakpoint, window resize): the gap
          // itself may have changed, so every child's span is stale, not just its own.
          for (const child of observed) place(child);
        } else {
          place(entry.target as HTMLElement);
        }
      }
    });

    const sync = (): void => {
      const current = new Set(Array.from(container.children).filter((c): c is HTMLElement => c instanceof HTMLElement));
      for (const child of observed) {
        if (!current.has(child)) {
          resizeObserver.unobserve(child);
          observed.delete(child);
        }
      }
      for (const child of current) {
        if (!observed.has(child)) {
          observed.add(child);
          resizeObserver.observe(child);
        }
        place(child);
      }
      reorder?.refresh();
    };

    sync();
    container.dataset["masonry"] = "on";

    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(container, { childList: true });
    // Column width changes (window resize, sidebar breakpoint) reflow text and change heights
    // of every panel at once — each child's own ResizeObserver entry covers that too, but the
    // container observer also catches the one-to-two-column switch itself.
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      reorder?.detach();
      delete container.dataset["masonry"];
      for (const child of observed) child.style.removeProperty("grid-row-end");
    };
  }, [layoutKey]);

  return (
    <div ref={ref} className={`dashboard-grid ${className}`}>
      {children}
    </div>
  );
}
