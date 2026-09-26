import { useEffect, useState } from "react";
import { useDebugStats } from "../store/debugStats.js";

/** `performance.memory` is a non-standard Chromium extension — same caveat as
 *  `store/accessibility.ts`'s own `navigator.deviceMemory` guard: no equivalent exists on
 *  Firefox or Safari, so this is read defensively and shown as "n/a" rather than guessed. */
interface ChromeMemoryInfo {
  readonly usedJSHeapSize: number;
}

function readMemoryMb(): number | undefined {
  const perf = performance as Performance & { memory?: ChromeMemoryInfo };
  if (perf.memory === undefined) return undefined;
  return Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
}

const FPS_SAMPLE_WINDOW_MS = 500;
const MEMORY_POLL_MS = 1000;

/**
 * `?debug=1`'s on-screen performance panel (M11, `docs/DEVICE_TEST.md`). Three real,
 * measured numbers, never estimated:
 *   - FPS: real `requestAnimationFrame` callbacks per second, sampled in rolling windows —
 *     the same technique `e2e/fps.spec.ts` already uses in CI, just running live instead of
 *     asserted once.
 *   - Memory: Chromium-only `performance.memory`, shown as "n/a" elsewhere rather than faked.
 *   - Tick: the simulation's own last/average tick wall-clock time (`store/debugStats.ts`,
 *     recorded from `store/run.ts`'s `step()` — the one place every real tick goes through).
 *
 * Rendered only when the caller (`App.tsx`) decides `?debug=1` is in the URL — this component
 * itself has no query-string knowledge, so it stays trivially SSR-safe (no `window` access
 * during render) and easy to unit-test standalone.
 */
export function DebugOverlay() {
  const [fps, setFps] = useState(0);
  const [memoryMb, setMemoryMb] = useState<number | undefined>(undefined);
  const lastTickMs = useDebugStats((s) => s.lastTickMs);
  const avgTickMs = useDebugStats((s) => s.avgTickMs);
  const tickCount = useDebugStats((s) => s.tickCount);

  useEffect(() => {
    let frames = 0;
    let windowStart = performance.now();
    let raf = 0;
    function onFrame() {
      frames++;
      const now = performance.now();
      const elapsed = now - windowStart;
      if (elapsed >= FPS_SAMPLE_WINDOW_MS) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(onFrame);
    }
    raf = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setMemoryMb(readMemoryMb());
    const id = setInterval(() => {
      setMemoryMb(readMemoryMb());
    }, MEMORY_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="debug-overlay" role="status" aria-label="Debug performance overlay">
      <p className="debug-overlay-row">
        FPS: <strong>{fps}</strong>
      </p>
      <p className="debug-overlay-row">
        Memory: <strong>{memoryMb === undefined ? "n/a" : `${memoryMb} MB`}</strong>
      </p>
      <p className="debug-overlay-row">
        Tick: <strong>{lastTickMs.toFixed(1)} ms</strong> (avg {avgTickMs.toFixed(1)} ms, {tickCount})
      </p>
    </aside>
  );
}
