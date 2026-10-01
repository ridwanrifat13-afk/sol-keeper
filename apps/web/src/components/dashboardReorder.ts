/**
 * Drag-to-reorder for a `DashboardGrid` (components/DashboardGrid.tsx).
 *
 * Why DOM-level rather than a React wrapper per panel: every console's panels are plain JSX
 * children (and several are components that render their own `<section className="panel">`),
 * and `styles.css`'s `.console.two-col > .view-head` / `.panel-span-full` rules target them as
 * *direct* grid children. Wrapping each one would break those rules and the masonry packing, so
 * this module works on the real children instead and leaves React's tree alone.
 *
 * - Identity: a panel is reorderable when it has a stable id (its `aria-labelledby`, which every
 *   panel already carries for accessibility) and a visible `<h2>` heading, which is its drag
 *   handle. The page header, alerts, and panels whose heading is visually hidden (the Habitat
 *   scene, Mission Command's status board) stay pinned where they are.
 * - Reordering is a CSS `order` change, not a DOM move, so React's reconciliation never sees a
 *   difference. The masonry packing re-flows on its own because auto-placement follows `order`.
 *   The trade-off, disclosed rather than hidden: Tab order stays DOM order, not visual order.
 * - Input: mouse/pen drag the heading directly (after a 4px threshold, so a plain click is
 *   still a click); touch needs a long press first so the page can still scroll; keyboard is
 *   Alt + arrow keys on a focused heading (or anything inside the panel).
 * - The chosen order is saved per page in localStorage and reapplied on every mount.
 */

export const LAYOUT_STORAGE_PREFIX = "sol-keeper.layout.";
export const RESET_LAYOUT_EVENT = "sol-keeper:reset-layout";

/** Pure: moves one item to a new index. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/**
 * Pure: puts the ids that were saved into their saved order, but leaves any id that was never
 * saved (a panel that only appears in some states) exactly where it naturally sits, so a new
 * panel never jumps to the end just because the player rearranged something else.
 */
export function rankOrder(natural: readonly string[], saved: readonly string[]): string[] {
  const present = new Set(natural);
  const known = saved.filter((id, i) => present.has(id) && saved.indexOf(id) === i);
  const knownSet = new Set(known);
  let next = 0;
  return natural.map((id) => (knownSet.has(id) ? (known[next++] as string) : id));
}

/** Removes every saved layout (the "Reset layout" control) and tells live grids to re-apply. */
export function clearAllLayouts(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(LAYOUT_STORAGE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked (private window): nothing was saved, so there is nothing to clear.
  }
  window.dispatchEvent(new Event(RESET_LAYOUT_EVENT));
}

const PINNED = ".view-head, .inline-alert, .debrief-actions";
const DRAG_THRESHOLD_PX = 4;
const LONG_PRESS_MS = 350;
const PRESS_SLOP_PX = 8;
const SETTLE_MS = 260;
const FLIP_MS = 220;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EDGE_PX = 80;
const MAX_SCROLL_PX = 18;
const HINT_ID = "dashboard-reorder-hint";

export interface Reorder {
  /** Re-reads the grid's children (call after the child list changes). */
  readonly refresh: () => void;
  readonly detach: () => void;
}

interface Pending {
  readonly item: HTMLElement;
  readonly handle: HTMLElement;
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly touch: boolean;
  timer: number | undefined;
}

interface Drag {
  readonly item: HTMLElement;
  readonly handle: HTMLElement;
  readonly pointerId: number;
  readonly grabX: number;
  readonly grabY: number;
  readonly startSeq: HTMLElement[];
  x: number;
  y: number;
  tx: number;
  ty: number;
  lastMove: number;
  raf: number;
  scrollRaf: number;
}

function animationsOn(): boolean {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !document.documentElement.classList.contains("low-power-mode")
  );
}

export function attachReorder(container: HTMLElement, layoutKey: string): Reorder {
  const storageKey = LAYOUT_STORAGE_PREFIX + layoutKey;

  const load = (): string[] => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  };
  let saved = load();

  const kids = (): HTMLElement[] =>
    Array.from(container.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
  const idOf = (el: HTMLElement): string | null =>
    el.getAttribute("data-widget-id") ?? el.getAttribute("aria-labelledby") ?? (el.id === "" ? null : el.id);
  const handleOf = (el: HTMLElement): HTMLElement | null =>
    el.matches(PINNED) ? null : el.querySelector<HTMLElement>("h2:not(.visually-hidden)");
  const isDraggable = (el: HTMLElement): boolean => idOf(el) !== null && handleOf(el) !== null;
  const orderOf = (el: HTMLElement): number => Number.parseInt(el.style.order || "0", 10);
  /** Reorderable panels in their current visual order. */
  const visualSeq = (): HTMLElement[] =>
    kids()
      .filter(isDraggable)
      .sort((a, b) => orderOf(a) - orderOf(b));
  const labelOf = (el: HTMLElement): string => handleOf(el)?.textContent?.trim() ?? "panel";

  /** Gives the reorderable panels the CSS `order` slots the draggable positions occupy. */
  const assignSlots = (seq: readonly HTMLElement[]): void => {
    const all = kids();
    const slots = all.map((k, i) => (isDraggable(k) ? i : -1)).filter((i) => i >= 0);
    seq.forEach((el, n) => {
      el.style.order = String(slots[n] ?? n);
    });
    all.forEach((k, i) => {
      if (!isDraggable(k)) k.style.order = String(i);
    });
  };

  const applyOrder = (): void => {
    const drags = kids().filter(isDraggable);
    const byId = new Map(drags.map((d) => [idOf(d) as string, d]));
    const ordered = rankOrder(
      drags.map((d) => idOf(d) as string),
      saved,
    );
    assignSlots(ordered.map((id) => byId.get(id) as HTMLElement));
  };

  /** First/Last/Invert/Play: animate every panel except `skip` from where it was to where it is. */
  const flip = (mutate: () => void, skip?: HTMLElement): void => {
    const first = new Map(kids().map((k) => [k, k.getBoundingClientRect()]));
    mutate();
    if (!animationsOn()) return;
    for (const k of kids()) {
      if (k === skip) continue;
      const before = first.get(k);
      if (before === undefined) continue;
      const after = k.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      k.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: FLIP_MS, easing: EASE },
      );
    }
  };

  const persist = (): void => {
    saved = visualSeq().map((el) => idOf(el) as string);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // Storage blocked: the order still holds for this page view, it just won't survive a reload.
    }
  };

  /* ------------------------------------------------------------ announcements + hint */
  const hint = document.getElementById(HINT_ID) ?? document.createElement("p");
  const ownsHint = hint.id !== HINT_ID;
  if (ownsHint) {
    hint.id = HINT_ID;
    hint.className = "visually-hidden";
    hint.textContent =
      "Drag this heading to rearrange panels. On touch screens, press and hold first. With a keyboard, hold Alt and press the arrow keys.";
    document.body.appendChild(hint);
  }
  const live = document.createElement("div");
  live.className = "visually-hidden";
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  document.body.appendChild(live);
  const announce = (message: string): void => {
    live.textContent = message;
  };

  const decorate = (): void => {
    const valid = new Set<HTMLElement>();
    for (const el of kids()) {
      const handle = isDraggable(el) ? handleOf(el) : null;
      if (handle === null) continue;
      valid.add(handle);
      handle.setAttribute("data-drag-handle", "");
      handle.setAttribute("tabindex", "0");
      handle.setAttribute("aria-describedby", HINT_ID);
      handle.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight");
    }
    for (const stale of Array.from(container.querySelectorAll<HTMLElement>("[data-drag-handle]"))) {
      if (!valid.has(stale)) {
        stale.removeAttribute("data-drag-handle");
        stale.removeAttribute("tabindex");
        stale.removeAttribute("aria-describedby");
        stale.removeAttribute("aria-keyshortcuts");
      }
    }
  };

  /* ------------------------------------------------------------ pointer dragging */
  let pending: Pending | null = null;
  let drag: Drag | null = null;

  // Registered once, up front (see attach below), not at lift time: a browser decides whether
  // a touch may scroll from the handlers present when it *starts*, so a listener added 350ms
  // into the press is too late and the browser cancels the pointer to scroll instead.
  const blockTouchScroll = (e: TouchEvent): void => {
    if ((drag !== null || pending !== null) && e.cancelable) e.preventDefault();
  };

  const render = (): void => {
    if (drag === null) return;
    const it = drag.item;
    it.style.transform = "";
    const r = it.getBoundingClientRect();
    drag.tx = drag.x - drag.grabX - r.left;
    drag.ty = drag.y - drag.grabY - r.top;
    it.style.transform = `translate3d(${drag.tx}px, ${drag.ty}px, 0)`;
  };

  /** Returns true when a reorder is being held back by the settle cooldown and should be retried. */
  const maybeReorder = (force = false): boolean => {
    if (drag === null) return false;
    const now = performance.now();
    if (!force && now - drag.lastMove < SETTLE_MS) return true;
    const { item, x, y } = drag;
    const target = kids().find((k) => {
      if (k === item || !isDraggable(k)) return false;
      const r = k.getBoundingClientRect();
      // Inset stops a panel being taken the instant the pointer grazes its edge (no flicker
      // between two arrangements), capped so a very tall panel doesn't need a deep drag in.
      const ix = Math.min(r.width * 0.15, 32);
      const iy = Math.min(r.height * 0.15, 32);
      return x > r.left + ix && x < r.right - ix && y > r.top + iy && y < r.bottom - iy;
    });
    if (target === undefined) return false;
    const seq = visualSeq();
    const from = seq.indexOf(item);
    const to = seq.indexOf(target);
    if (from < 0 || to < 0 || from === to) return false;
    flip(() => {
      assignSlots(moveItem(seq, from, to));
    }, item);
    render();
    drag.lastMove = now;
    return false;
  };

  const frame = (): void => {
    if (drag === null) return;
    drag.raf = 0;
    render();
    // Held back by the cooldown: look again next frame, so a panel held still still settles.
    if (maybeReorder() && drag.raf === 0) drag.raf = requestAnimationFrame(frame);
  };

  const scrollLoop = (): void => {
    if (drag === null) return;
    const vh = window.innerHeight;
    let delta = 0;
    if (drag.y < EDGE_PX) delta = -Math.ceil(((EDGE_PX - drag.y) / EDGE_PX) * MAX_SCROLL_PX);
    else if (drag.y > vh - EDGE_PX) delta = Math.ceil(((drag.y - (vh - EDGE_PX)) / EDGE_PX) * MAX_SCROLL_PX);
    if (delta !== 0) {
      window.scrollBy(0, delta);
      render();
      maybeReorder();
    }
    drag.scrollRaf = requestAnimationFrame(scrollLoop);
  };

  const finish = (commit: boolean): void => {
    if (drag === null) return;
    // Dropping lands the panel where the pointer is, even inside the settle cooldown.
    if (commit) {
      render();
      maybeReorder(true);
    }
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    cancelAnimationFrame(d.scrollRaf);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onEscape, true);
    try {
      d.handle.releasePointerCapture(d.pointerId);
    } catch {
      // Capture was already released (the browser takes it on cancel).
    }
    container.classList.remove("is-reordering");

    const { item, tx, ty } = d;
    if (!commit) {
      flip(() => {
        assignSlots(d.startSeq);
      }, item);
    }
    item.style.transform = "";
    item.classList.remove("dashboard-item-lifted");
    item.classList.add("dashboard-item-settling");
    if (animationsOn()) {
      // Where the panel was dropped, relative to where its slot actually is now.
      item.animate(
        [{ transform: `translate3d(${tx}px, ${ty}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
        { duration: FLIP_MS, easing: EASE },
      );
    }
    window.setTimeout(() => {
      item.classList.remove("dashboard-item-settling");
    }, FLIP_MS);

    if (commit) {
      persist();
      const seq = visualSeq();
      announce(`Dropped ${labelOf(item)} at position ${seq.indexOf(item) + 1} of ${seq.length}.`);
    } else {
      announce(`Move cancelled. ${labelOf(item)} returned to its place.`);
    }
  };

  const startDrag = (p: Pending): void => {
    if (p.timer !== undefined) window.clearTimeout(p.timer);
    pending = null;
    const rect = p.item.getBoundingClientRect();
    drag = {
      item: p.item,
      handle: p.handle,
      pointerId: p.pointerId,
      grabX: p.x - rect.left,
      grabY: p.y - rect.top,
      startSeq: visualSeq(),
      x: p.x,
      y: p.y,
      tx: 0,
      ty: 0,
      lastMove: performance.now(),
      raf: 0,
      scrollRaf: 0,
    };
    try {
      p.handle.setPointerCapture(p.pointerId);
    } catch {
      // Not capturable (synthetic event): window listeners below still receive the moves.
    }
    window.getSelection()?.removeAllRanges();
    p.item.classList.add("dashboard-item-lifted");
    container.classList.add("is-reordering");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onEscape, true);
    if (p.touch) navigator.vibrate?.(10);
    drag.scrollRaf = requestAnimationFrame(scrollLoop);
    announce(`Picked up ${labelOf(p.item)}. Move it over another panel to swap places.`);
    render();
  };

  function onPointerMove(e: PointerEvent): void {
    if (pending !== null && e.pointerId === pending.pointerId) {
      const dist = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (pending.touch) {
        if (dist > PRESS_SLOP_PX) cancelPending();
      } else if (dist > DRAG_THRESHOLD_PX) {
        startDrag(pending);
      }
      return;
    }
    if (drag === null || e.pointerId !== drag.pointerId) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.raf === 0) drag.raf = requestAnimationFrame(frame);
  }

  function onPointerUp(e: PointerEvent): void {
    if (pending !== null && e.pointerId === pending.pointerId) {
      cancelPending();
      return;
    }
    if (drag !== null && e.pointerId === drag.pointerId) finish(true);
  }

  function onPointerCancel(e: PointerEvent): void {
    if (pending !== null && e.pointerId === pending.pointerId) {
      cancelPending();
      return;
    }
    if (drag !== null && e.pointerId === drag.pointerId) finish(false);
  }

  function onEscape(e: KeyboardEvent): void {
    if (e.key === "Escape" && drag !== null) {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  }

  function cancelPending(): void {
    if (pending?.timer !== undefined) window.clearTimeout(pending.timer);
    pending = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (pending !== null || drag !== null || e.button !== 0 || !e.isPrimary) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    const heading = target.closest("h2");
    if (heading === null || target.closest("button, a, input, select, textarea") !== null) return;
    const item = kids().find((k) => k.contains(heading));
    if (item === undefined || !isDraggable(item) || handleOf(item) !== heading) return;

    const touch = e.pointerType === "touch";
    const next: Pending = {
      item,
      handle: heading as HTMLElement,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      touch,
      timer: undefined,
    };
    pending = next;
    if (touch) {
      next.timer = window.setTimeout(() => {
        if (pending === next) startDrag(next);
      }, LONG_PRESS_MS);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  };

  /* ------------------------------------------------------------ keyboard */
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!e.altKey || e.ctrlKey || e.metaKey || drag !== null) return;
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) return;
    const target = e.target;
    if (!(target instanceof Element) || target.closest("input, textarea, select") !== null) return;
    const item = kids().find((k) => k.contains(target));
    if (item === undefined || !isDraggable(item)) return;
    e.preventDefault();
    const seq = visualSeq();
    const from = seq.indexOf(item);
    const to = from + delta;
    if (to < 0 || to >= seq.length) {
      announce(`${labelOf(item)} is already ${delta < 0 ? "first" : "last"}.`);
      return;
    }
    flip(() => {
      assignSlots(moveItem(seq, from, to));
    });
    persist();
    item.scrollIntoView({ block: "nearest", behavior: animationsOn() ? "smooth" : "auto" });
    announce(`${labelOf(item)} moved to position ${to + 1} of ${seq.length}.`);
  };

  const onReset = (): void => {
    saved = [];
    flip(applyOrder);
    announce("Layout reset to the default order.");
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("touchmove", blockTouchScroll, { passive: false });
  window.addEventListener(RESET_LAYOUT_EVENT, onReset);

  const refresh = (): void => {
    applyOrder();
    decorate();
  };
  refresh();

  return {
    refresh,
    detach: () => {
      if (pending !== null) cancelPending();
      if (drag !== null) finish(false);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("touchmove", blockTouchScroll);
      window.removeEventListener(RESET_LAYOUT_EVENT, onReset);
      for (const stale of Array.from(container.querySelectorAll<HTMLElement>("[data-drag-handle]"))) {
        stale.removeAttribute("data-drag-handle");
        stale.removeAttribute("tabindex");
        stale.removeAttribute("aria-describedby");
        stale.removeAttribute("aria-keyshortcuts");
      }
      for (const k of kids()) k.style.removeProperty("order");
      live.remove();
      if (ownsHint) hint.remove();
    },
  };
}
